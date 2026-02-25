/* =====================================================
   useVoiceSocket.js
   -----------------------------------------------------
   Fixed version with proper socket handling:
   - No global socket disconnection on unmount
   - Named event handlers for proper cleanup
   - Removed redundant WebRTC event bridge
   - Proper reconnection handling
   - ✅ Added isConnected state for WebRTC timing
   - ✅ Moved voice:join inside socket.on("connect") to eliminate race condition
   - ✅ Consolidated disconnect handlers to prevent duplicate listeners
   - ✅ Heartbeat starts only after successful join (semantic hardening)
   - ✅ Join in-flight guard to prevent duplicate emits
   - ✅ Join success tracking for safe leave
   - ✅ Reconnect fallback to join on failure
   - ✅ StrictMode safe leave emissions
   - ✅ Added voice:speaker:declined handler
   - ✅ Added device meta to requestToSpeak
   - ✅ Fixed alreadyPresent check for speakers
   - ✅ EXTRACTED joinInstance for centralized join logic
   - ✅ FIXED: joinedRef reset on join failure
   - ✅ FIXED: Clear heartbeat in leaveRoom
   - ✅ FIXED: Use socket.io "reconnect" event instead of "connect"
   - ✅ FIXED: Added instanceId safety check in emit helper
   - ✅ FIXED: Set joinedRef.current = true on successful join (prevents double join after reconnect)
   - ✅ HARDENING: Eager joinedRef setting moved inside success handler
   - ✅ HARDENING: Reconnect handler uses instanceId check instead of joinedRef
   - ✅ HARDENING: Development-only console logs
===================================================== */

import { useEffect, useRef, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { connectSocket } from "../services/socket";
import { loadVoiceSounds, playJoin, playLeave, playReconnect } from "../utils/voiceSounds";

/* =====================================================
   REDUX ACTIONS
===================================================== */

import {
    voiceJoined,
    voiceLeft,

    voiceUserJoined,
    voiceUserLeft,

    voiceSpeakerRequested,
    voiceSpeakerApproved,
    voiceSpeakerDemoted,
    voiceSpeakerDeclined,

    voiceStageLocked,
    voiceStageUnlocked,

    voiceUserMuted,
    voiceUserUnmuted,
    voiceUserSpeaking,

    voiceChatMessageReceived,
    voiceChatDisabled,
    voiceChatEnabled,
    voiceChatUserMuted,
    voiceChatUserUnmuted,

    voiceHeartbeat,

    voiceRoomEnded,
    voiceHostChanged,

    voiceRecordingStarted,
    voiceRecordingReady,

    voiceUserRemoved,
    voiceUserBanned,
} from "../store/slices/communitySlice";

/* =====================================================
   HOOK DEFINITION
===================================================== */

export function useVoiceSocket({
    voiceId,
    instanceId,
    enabled = true,
    token,
    localUserId
}) {
    /* =====================================================
       INTERNAL REFS & STATE
    ===================================================== */

    const dispatch = useDispatch();

    const socketRef = useRef(null);
    const heartbeatRef = useRef(null);

    /**
     * ✅ Track real socket connection state
     */
    const [isConnected, setIsConnected] = useState(false);

    /**
     * Prevents double-joining on re-render
     * This is CRITICAL for React Strict Mode
     */
    const joinedRef = useRef(false);
    const leftRef = useRef(false);
    const hasReconnectedRef = useRef(false);
    const hasEverConnectedRef = useRef(false);
    const soundsLoadedRef = useRef(false);

    // ===== HARDENING REFS =====
    const joinInFlightRef = useRef(false);   // prevents duplicate join emits
    const didJoinOkRef = useRef(false);      // true only after successful join

    useEffect(() => {
        if (!enabled) return;
        if (soundsLoadedRef.current) return;

        loadVoiceSounds();
        soundsLoadedRef.current = true;
    }, [enabled]);

    const instance = useSelector((s) => s.community.instance);

    /* =====================================================
       DEBUG LOG
       🔴 FIX #3: Development-only logging
    ===================================================== */

    if (process.env.NODE_ENV === "development") {
        console.log("[voice] socket init", {
            voiceId,
            instanceId,
            enabled,
            token: token ? "present" : "missing",
        });
    }

    /* =====================================================
       ✅ STEP 1: EXTRACTED JOIN LOGIC
       Centralized join function that can be called from anywhere
       🔴 FIX #1: Set joinedRef only on success
    ===================================================== */

    const joinInstance = useCallback(() => {
        const socket = socketRef.current;
        if (!socket) return;
        if (!instanceId) return;
        
        // 🔴 FIX #1: Check both joinedRef and joinInFlightRef
        if (joinedRef.current || joinInFlightRef.current) return;

        if (process.env.NODE_ENV === "development") {
            console.log("[voice] joining instance:", instanceId);
        }

        joinInFlightRef.current = true;

        socket.emit(
            "voice:join",
            { instanceId },
            (res) => {
                joinInFlightRef.current = false;

                if (!res?.success) {
                    if (process.env.NODE_ENV === "development") {
                        console.error("[voice] join failed", res);
                    }
                    didJoinOkRef.current = false;
                    joinedRef.current = false; // Allow retry on failure
                    return;
                }

                didJoinOkRef.current = true;
                leftRef.current = false;
                // 🔴 FIX #1: Set joined flag ONLY on success
                joinedRef.current = true;

                /**
                 * Hydrate Redux voice state
                 */
                dispatch(
                    voiceJoined({
                        room: res.room,
                        instance: res.instance,
                        role: res.role,
                        chatEnabled: res.chatEnabled,
                        lockedStage: res.lockedStage,
                    })
                );

                /* =====================================================
                   HEARTBEAT (KEEP ALIVE) - START ONLY AFTER SUCCESSFUL JOIN
                   ✅ Semantic: Heartbeat implies active membership
                ===================================================== */
                if (!heartbeatRef.current) {
                    heartbeatRef.current = setInterval(() => {
                        socket.emit("voice:heartbeat", { instanceId });
                        dispatch(voiceHeartbeat());
                    }, 15000);
                }
            }
        );
    }, [instanceId, dispatch]);

    /* =====================================================
       CONNECT + JOIN (INSTANCE SCOPED)
       ✅ FIXED: voice:join now fires ONLY after socket connection is confirmed
       ✅ HEARTBEAT: Starts only after successful join
       ✅ JOIN GUARD: Prevents duplicate emits
    ===================================================== */

    useEffect(() => {
        /**
         * Guard clauses:
         * - socket disabled
         * - missing instanceId
         * - already joined
         */
        if (!enabled) return;
        if (!instanceId) return;
        
        // 🔴 FIX #1: Don't set joinedRef here - let joinInstance handle it on success
        if (joinedRef.current || joinInFlightRef.current) return;

        /* =====================================================
           CONNECT SOCKET
        ===================================================== */

        const socket = connectSocket(token);
        socketRef.current = socket;

        if (process.env.NODE_ENV === "development") {
            console.log("[voice] socket instance created");
        }

        /* =====================================================
           ✅ STEP 2: SIMPLIFIED CONNECTION HANDLERS
        ===================================================== */

        const handleConnect = () => {
            if (process.env.NODE_ENV === "development") {
                console.log("[voice] socket connected (real)");
            }
            setIsConnected(true);
            hasEverConnectedRef.current = true;

            // ✅ Use extracted join function
            joinInstance();
        };

        const handleDisconnect = () => {
            if (process.env.NODE_ENV === "development") {
                console.log("[voice] socket disconnected");
            }
            setIsConnected(false);

            // ✅ Clean up heartbeat on disconnect
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current);
                heartbeatRef.current = null;
            }
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);

        /* =====================================================
           IF ALREADY CONNECTED (HOT RELOAD / REUSE)
        ===================================================== */

        if (socket.connected) {
            handleConnect();
        }

        /* =====================================================
           CLEANUP ON UNMOUNT
        ===================================================== */

        return () => {
            if (process.env.NODE_ENV === "development") {
                console.log("[voice] leaving instance:", instanceId);
            }

            joinedRef.current = false;
            setIsConnected(false);

            // Remove connection listeners
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);

            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current);
                heartbeatRef.current = null;
            }

            // ✅ Only emit leave if we successfully joined, DO NOT disconnect the global socket
            // ✅ StrictMode safe: prevents duplicate leave on remount
            if (didJoinOkRef.current && !leftRef.current) {
                leftRef.current = true;
                socket.emit("voice:leave", { instanceId });
                // dispatch(voiceLeft());
            }
            // ❌ REMOVED: socket.disconnect();
        };
    }, [enabled, instanceId, token, dispatch, joinInstance]);

    /* =====================================================
       ✅ STEP 3: FIXED RECONNECT HANDLING
       Now uses socket.io "reconnect" event and joinInstance for fallback
       🔴 FIX #2: Use instanceId check instead of joinedRef
    ===================================================== */

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;
        
        // 🔴 FIX #2: Check instanceId, not joinedRef
        if (!instanceId) return;

        const handleReconnect = () => {
            if (!hasEverConnectedRef.current) {
                hasEverConnectedRef.current = true;
                return; // 🚫 initial connect → no sound
            }

            if (process.env.NODE_ENV === "development") {
                console.log("[voice] reconnecting instance:", instanceId);
            }

            // ✅ HARDENING: Prevent duplicate reconnect emits
            if (joinInFlightRef.current) return;
            joinInFlightRef.current = true;

            socket.emit(
                "voice:reconnect",
                { instanceId },
                (res) => {
                    joinInFlightRef.current = false;

                    if (!res?.success) {
                        if (process.env.NODE_ENV === "development") {
                            console.warn("[voice] reconnect failed — falling back to join");
                        }
                        didJoinOkRef.current = false;
                        joinedRef.current = false; // Reset to allow retry
                        // ✅ STEP 4: Use extracted joinInstance for fallback
                        return joinInstance();
                    }

                    didJoinOkRef.current = true;
                    joinedRef.current = true; // ✅ Ensure joined flag is set

                    dispatch(
                        voiceJoined({
                            room: res.room,
                            instance: res.instance,
                            role: res.role,
                            chatEnabled: res.chatEnabled,
                            lockedStage: res.lockedStage,
                            reconnected: true,
                        })
                    );

                    if (!heartbeatRef.current) {
                        heartbeatRef.current = setInterval(() => {
                            socket.emit("voice:heartbeat", { instanceId });
                            dispatch(voiceHeartbeat());
                        }, 15000);
                    }

                    if (!hasReconnectedRef.current) {
                        playReconnect();
                        hasReconnectedRef.current = true;
                    }
                }
            );
        };

        // ✅ FIX: Use socket.io "reconnect" event instead of "connect"
        socket.io?.on("reconnect", handleReconnect);

        return () => {
            socket.io?.off("reconnect", handleReconnect);
        };
    }, [instanceId, dispatch, joinInstance]);

    /* =====================================================
       SOCKET EVENT BINDINGS
    ===================================================== */

    useEffect(() => {
        if (!enabled) return;
        if (!socketRef.current) return;

        const socket = socketRef.current;

        /* =====================================================
           USER PRESENCE - Using named handlers for proper cleanup
        ===================================================== */
        
        const onUserJoined = ({ userId, role, participant, shouldCreateOffer }) => {
            if (!participant?._id) return;

            dispatch(voiceUserJoined(participant));

            // ✅ Check both participants AND speakers arrays
            const alreadyPresent =
                instance?.participants?.some(
                    (p) => String(p._id) === String(participant._id)
                ) ||
                instance?.speakers?.some(
                    (p) => String(p._id) === String(participant._id)
                );

            // 🔊 play sound ONLY for real new joins, not reconnects
            if (!alreadyPresent && participant._id !== localUserId) {
                playJoin();
            }

            // ✅ WebRTC hook listens directly to voice:user:joined
        };

        const onRoomHydrated = ({ room, instance }) => {
            dispatch(voiceJoined({
                room,
                instance,
                reconnected: true,
            }));
        };

        const onUserLeft = ({ userId }) => {
            dispatch(voiceUserLeft({ userId }));

            // 🔊 DO NOT play sound for self
            if (userId !== localUserId) {
                playLeave();
            }

            // ✅ WebRTC hook listens directly to voice:user:left
        };

        const onRoomEnded = () => {
            dispatch(voiceRoomEnded());
        };

        const onHostChanged = ({ userId }) => {
            dispatch(voiceHostChanged({ userId }));
        };

        /* =====================================================
           SPEAKER / STAGE CONTROL
        ===================================================== */

        const onSpeakerRequested = ({ userId, meta }) => {
            dispatch(voiceSpeakerRequested({ userId, meta }));
        };

        const onSpeakerApproved = ({ userId }) => {
            dispatch(voiceSpeakerApproved({ userId }));
        };

        const onSpeakerDeclined = ({ userId }) => {
            dispatch(voiceSpeakerDeclined({ userId }));
        };

        const onSpeakerDemoted = ({ userId }) => {
            dispatch(voiceSpeakerDemoted({ userId }));
        };

        const onStageLocked = () => {
            dispatch(voiceStageLocked());
        };

        const onStageUnlocked = () => {
            dispatch(voiceStageUnlocked());
        };

        /* =====================================================
           AUDIO SIGNALING (NO WEBRTC)
        ===================================================== */

        const onUserMuted = ({ userId }) => {
            dispatch(voiceUserMuted({ userId }));
        };

        const onUserUnmuted = ({ userId }) => {
            dispatch(voiceUserUnmuted({ userId }));
        };

        const onUserSpeaking = ({ userId, isSpeaking }) => {
            dispatch(voiceUserSpeaking({ userId, isSpeaking }));
        };

        /* =====================================================
           CHAT EVENTS
        ===================================================== */

        const onChatMessage = (payload) => {
            dispatch(voiceChatMessageReceived(payload));
        };

        const onChatDisabled = () => {
            dispatch(voiceChatDisabled());
        };

        const onChatEnabled = () => {
            dispatch(voiceChatEnabled());
        };

        const onChatUserMuted = ({ userId }) => {
            dispatch(voiceChatUserMuted({ userId }));
        };

        const onChatUserUnmuted = ({ userId }) => {
            dispatch(voiceChatUserUnmuted({ userId }));
        };

        /* =====================================================
           RECORDING EVENTS
        ===================================================== */

        const onRecordingStarted = () => {
            dispatch(voiceRecordingStarted());
        };

        const onRecordingReady = ({ replayUrl }) => {
            dispatch(voiceRecordingReady({ replayUrl }));
        };

        /* =====================================================
           MODERATION EVENTS
        ===================================================== */

        const onUserKicked = ({ userId }) => {
            dispatch(voiceUserRemoved({ userId }));
        };

        const onUserBanned = ({ userId }) => {
            dispatch(voiceUserBanned({ userId }));
        };

        /* =====================================================
           REGISTER ALL LISTENERS
        ===================================================== */

        // User presence
        socket.on("voice:user:joined", onUserJoined);
        socket.on("voice:room:hydrated", onRoomHydrated);
        socket.on("voice:user:left", onUserLeft);
        socket.on("voice:room:ended", onRoomEnded);
        socket.on("voice:host:changed", onHostChanged);

        // Speaker/stage control
        socket.on("voice:speaker:requested", onSpeakerRequested);
        socket.on("voice:speaker:approved", onSpeakerApproved);
        socket.on("voice:speaker:declined", onSpeakerDeclined);
        socket.on("voice:speaker:demoted", onSpeakerDemoted);
        socket.on("voice:stage:locked", onStageLocked);
        socket.on("voice:stage:unlocked", onStageUnlocked);

        // Audio signaling
        socket.on("voice:user:muted", onUserMuted);
        socket.on("voice:user:unmuted", onUserUnmuted);
        socket.on("voice:user:speaking", onUserSpeaking);

        // Chat events
        socket.on("voice:chat:message", onChatMessage);
        socket.on("voice:chat:disabled", onChatDisabled);
        socket.on("voice:chat:enabled", onChatEnabled);
        socket.on("voice:chat:user:muted", onChatUserMuted);
        socket.on("voice:chat:user:unmuted", onChatUserUnmuted);

        // Recording events
        socket.on("voice:recording:started", onRecordingStarted);
        socket.on("voice:recording:ready", onRecordingReady);

        // Moderation events
        socket.on("voice:user:kicked", onUserKicked);
        socket.on("voice:user:banned", onUserBanned);

        /* =====================================================
           CLEANUP - Using named handlers for each event
        ===================================================== */

        return () => {
            // User presence
            socket.off("voice:user:joined", onUserJoined);
            socket.off("voice:room:hydrated", onRoomHydrated);
            socket.off("voice:user:left", onUserLeft);
            socket.off("voice:room:ended", onRoomEnded);
            socket.off("voice:host:changed", onHostChanged);

            // Speaker/stage control
            socket.off("voice:speaker:requested", onSpeakerRequested);
            socket.off("voice:speaker:approved", onSpeakerApproved);
            socket.off("voice:speaker:declined", onSpeakerDeclined);
            socket.off("voice:speaker:demoted", onSpeakerDemoted);
            socket.off("voice:stage:locked", onStageLocked);
            socket.off("voice:stage:unlocked", onStageUnlocked);

            // Audio signaling
            socket.off("voice:user:muted", onUserMuted);
            socket.off("voice:user:unmuted", onUserUnmuted);
            socket.off("voice:user:speaking", onUserSpeaking);

            // Chat events
            socket.off("voice:chat:message", onChatMessage);
            socket.off("voice:chat:disabled", onChatDisabled);
            socket.off("voice:chat:enabled", onChatEnabled);
            socket.off("voice:chat:user:muted", onChatUserMuted);
            socket.off("voice:chat:user:unmuted", onChatUserUnmuted);

            // Recording events
            socket.off("voice:recording:started", onRecordingStarted);
            socket.off("voice:recording:ready", onRecordingReady);

            // Moderation events
            socket.off("voice:user:kicked", onUserKicked);
            socket.off("voice:user:banned", onUserBanned);
        };
    }, [enabled, dispatch, instance, localUserId]);

    /* =====================================================
       EMIT HELPER
       ✅ Added safety check against stale instanceId
    ===================================================== */

    const emit = useCallback(
        (event, payload = {}) => {
            // ✅ Safety: Don't emit if no instanceId
            if (!instanceId) {
                if (process.env.NODE_ENV === "development") {
                    console.warn(`[voice] Attempted to emit ${event} without instanceId`);
                }
                return;
            }
            
            socketRef.current?.emit(event, {
                instanceId,
                ...payload,
            });
        },
        [instanceId]
    );

    /* =====================================================
       PUBLIC API
       ✅ Fixed leaveRoom to clear heartbeat
    ===================================================== */

    return {
        /* ===== SOCKET STATE ===== */
        socket: socketRef.current,
        isConnected,

        /* ===== SPEAKING ===== */
        requestToSpeak: (meta) => emit("voice:request:speak", { meta }),
        approveSpeaker: (userId) =>
            emit("voice:approve:speaker", { userId }),
        declineSpeaker: (userId) =>
            emit("voice:decline:speaker", { userId }),
        demoteSpeaker: (userId) =>
            emit("voice:demote:speaker", { userId }),

        /* ===== AUDIO ===== */
        muteUser: (userId) =>
            emit("voice:mute:user", { userId }),
        unmuteUser: (userId) =>
            emit("voice:unmute:user", { userId }),
        setSpeaking: (isSpeaking) =>
            emit("voice:speaking", { isSpeaking }),

        /* ===== CHAT ===== */
        sendChatMessage: (message) =>
            emit("voice:chat:message", { message }),
        enableChat: () => emit("voice:chat:enable"),
        disableChat: () => emit("voice:chat:disable"),
        muteChatUser: (userId) =>
            emit("voice:chat:mute:user", { userId }),
        unmuteChatUser: (userId) =>
            emit("voice:chat:unmute:user", { userId }),

        /* ===== STAGE ===== */
        lockStage: () => emit("voice:stage:lock"),
        unlockStage: () => emit("voice:stage:unlock"),

        /* ===== SESSION ===== */
        leaveRoom: () => {
            if (leftRef.current) return;
            leftRef.current = true;
            hasReconnectedRef.current = false;

            // ✅ Clear heartbeat on manual leave
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current);
                heartbeatRef.current = null;
            }

            if (didJoinOkRef.current) {
                emit("voice:leave");
            }
        },

        /* ===== RECORDING ===== */
        startRecording: () => emit("voice:recording:start"),
        stopRecording: () => emit("voice:recording:stop"),

        /* ===== MODERATION ===== */
        kickUser: (userId) =>
            emit("voice:moderation:kick", { userId }),
        banUser: (userId) =>
            emit("voice:moderation:ban", { userId }),
    };   
}