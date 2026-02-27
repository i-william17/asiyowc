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
   - ✅ ADDED: voice:instance:sync handler for authoritative state updates
   - ✅ FIXED: Removed delta mutations (voice:user:joined, voice:user:left, etc.)
   - ✅ FIXED: Pure authoritative state replacement (no merging)
   - ✅ FIXED: Removed instance from dependency array to prevent listener rebinding
   - ✅ ADDED: voice:kicked handler for immediate navigation
   - ✅ ADDED: voice:force:mute handler for WebRTC control
   - ✅ ADDED: voice:force:unmute handler for WebRTC control
   - ✅ ADDED: voice:terminate:rtc handler for immediate WebRTC cleanup
   - ✅ FIXED: Renamed internal onKicked to handleKicked to prevent prop shadowing
   - ✅ FIXED: Removed duplicate voice:user:kicked handler
   - ✅ FIXED: Added window existence check for CustomEvent dispatch
   - ✅ ADDED: voice:chat:toast handler for bottom overlay notifications
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
    // voiceLeft,

    // 🔴 REMOVED: voiceUserJoined, voiceUserLeft (now from sync only)
    // 🔴 REMOVED: voiceSpeakerApproved, voiceSpeakerDemoted (now from sync only)
    // 🔴 REMOVED: voiceUserMuted, voiceUserUnmuted (now from sync only)

    voiceSpeakerRequested,
    voiceSpeakerDeclined,

    voiceInstanceSynced,
    voiceStageLocked,
    voiceStageUnlocked,

    voiceUserSpeaking,

    voiceChatMessageReceived,
    voiceChatToastReceived, // ✅ ADDED: Toast action
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
    localUserId,
    onKicked, // Optional callback for navigation
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

    const previousSpeakersRef = useRef([]);
    const previousParticipantsRef = useRef([]);

    // ===== HARDENING REFS =====
    const joinInFlightRef = useRef(false);   // prevents duplicate join emits
    const didJoinOkRef = useRef(false);      // true only after successful join

    useEffect(() => {
        if (!enabled) return;
        if (soundsLoadedRef.current) return;

        loadVoiceSounds();
        soundsLoadedRef.current = true;
    }, [enabled]);

    // We still need instance for sound effects but NOT for dependencies
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
       ✅ ADDED: voice:instance:sync handler for authoritative state updates
       🔴 FIXED: Removed all delta mutation handlers (now only sync for structure)
       🔴 FIXED: Removed instance from dependency array to prevent rebinding
       ✅ ADDED: voice:kicked handler for immediate navigation
       ✅ ADDED: voice:force:mute handler for WebRTC control
       ✅ ADDED: voice:force:unmute handler for WebRTC control
       ✅ ADDED: voice:terminate:rtc handler for immediate WebRTC cleanup
       🔴 FIXED: Renamed internal onKicked to handleKicked to prevent prop shadowing
       🔴 FIXED: Removed duplicate voice:user:kicked handler
       🔴 FIXED: Added window existence check for CustomEvent dispatch
       ✅ ADDED: voice:chat:toast handler for bottom overlay notifications
    ===================================================== */

    useEffect(() => {
        if (!enabled) return;
        if (!socketRef.current) return;

        const socket = socketRef.current;

        /* =====================================================
           AUTHORITATIVE STATE SYNC (ONLY STRUCTURAL UPDATES)
           ✅ Pure replacement, no merging
        ===================================================== */
        const onInstanceSync = ({
            instanceId: syncInstanceId,
            speakers,
            participants,
            chatEnabled,
            lockedStage,
        }) => {
            if (!syncInstanceId || syncInstanceId !== instanceId) return;

            const newSpeakers = speakers || [];
            const newParticipants = participants || [];

            const prevSpeakers = previousSpeakersRef.current || [];
            const prevParticipants = previousParticipantsRef.current || [];

            // Convert to ID sets
            const prevIds = new Set([
                ...prevSpeakers.map(u => String(u._id)),
                ...prevParticipants.map(u => String(u._id)),
            ]);

            const newIds = new Set([
                ...newSpeakers.map(u => String(u._id)),
                ...newParticipants.map(u => String(u._id)),
            ]);

            // Detect joins
            for (const id of newIds) {
                if (!prevIds.has(id) && id !== String(localUserId)) {
                    playJoin();
                }
            }

            // Detect leaves
            for (const id of prevIds) {
                if (!newIds.has(id) && id !== String(localUserId)) {
                    playLeave();
                }
            }

            // Store for next comparison
            previousSpeakersRef.current = newSpeakers;
            previousParticipantsRef.current = newParticipants;

            dispatch(
                voiceInstanceSynced({
                    instanceId: syncInstanceId,
                    speakers: newSpeakers,
                    participants: newParticipants,
                    chatEnabled,
                    lockedStage,
                })
            );
        };

        /* =====================================================
           KICK HANDLER - Immediate navigation
           🔴 FIXED: Renamed to handleKicked to avoid prop shadowing
        ===================================================== */
        const handleKicked = ({ instanceId: kickedInstanceId }) => {
            if (kickedInstanceId !== instanceId) return;

            if (process.env.NODE_ENV === "development") {
                console.log("[voice] kicked from instance:", instanceId);
            }

            // Mark as left to prevent further emits
            leftRef.current = true;
            didJoinOkRef.current = false;
            joinedRef.current = false;

            // Clear heartbeat
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current);
                heartbeatRef.current = null;
            }

            // Dispatch user removal
            dispatch(voiceUserRemoved({ userId: localUserId }));

            // Optional callback for navigation
            onKicked?.();
        };

        /* =====================================================
           FORCE MUTE/UNMUTE HANDLERS - For WebRTC control
           🔴 FIXED: Added window existence check
        ===================================================== */
        const onForceMute = ({ instanceId: muteInstanceId }) => {
            if (muteInstanceId !== instanceId) return;

            if (process.env.NODE_ENV === "development") {
                console.log("[voice] force mute received");
            }

            // ✅ Safe dispatch with window check
            if (typeof window !== "undefined") {
                window.dispatchEvent(
                    new CustomEvent("voice:force:mute", { 
                        detail: { instanceId } 
                    })
                );
            }
        };

        const onForceUnmute = ({ instanceId: unmuteInstanceId }) => {
            if (unmuteInstanceId !== instanceId) return;

            if (process.env.NODE_ENV === "development") {
                console.log("[voice] force unmute received");
            }

            if (typeof window !== "undefined") {
                window.dispatchEvent(
                    new CustomEvent("voice:force:unmute", { 
                        detail: { instanceId } 
                    })
                );
            }
        };

        /* =====================================================
           TERMINATE RTC HANDLER - Immediate WebRTC cleanup
           🔴 FIXED: Added window existence check
        ===================================================== */
        const onTerminateRTC = ({ instanceId: terminateInstanceId }) => {
            if (terminateInstanceId !== instanceId) return;

            if (process.env.NODE_ENV === "development") {
                console.log("[voice] terminate RTC received");
            }

            if (typeof window !== "undefined") {
                window.dispatchEvent(
                    new CustomEvent("voice:terminate:rtc", { 
                        detail: { instanceId } 
                    })
                );
            }
        };

        /* =====================================================
           EPHEMERAL EVENTS (Non-structural)
           These are fine because they don't affect core membership
        ===================================================== */

        const onSpeakerRequested = ({ participant, meta }) => {
            if (!participant?._id) return;

            dispatch(
                voiceSpeakerRequested({
                    userId: participant._id,
                    participant,
                    meta,
                })
            );
        };

        const onSpeakerDeclined = ({ userId }) => {
            dispatch(voiceSpeakerDeclined({ userId }));
        };

        const onUserSpeaking = ({ userId, isSpeaking }) => {
            dispatch(voiceUserSpeaking({ userId, isSpeaking }));
        };

        const onStageLocked = () => {
            dispatch(voiceStageLocked());
        };

        const onStageUnlocked = () => {
            dispatch(voiceStageUnlocked());
        };

        const onChatMessage = (payload) => {
            dispatch(voiceChatMessageReceived(payload));
        };

        // ✅ ADDED: Toast notification handler
        const onChatToast = (payload) => {
            dispatch(voiceChatToastReceived(payload));
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

        const onRecordingStarted = () => {
            dispatch(voiceRecordingStarted());
        };

        const onRecordingReady = ({ replayUrl }) => {
            dispatch(voiceRecordingReady({ replayUrl }));
        };

        const onRoomEnded = () => {
            dispatch(voiceRoomEnded());
        };

        const onHostChanged = ({ userId }) => {
            dispatch(voiceHostChanged({ userId }));
        };

        /* =====================================================
           REGISTER ALL LISTENERS
           🔴 FIXED: Removed duplicate voice:user:kicked handler
           ✅ ADDED: voice:chat:toast listener
        ===================================================== */

        // Authoritative state sync (only structural source of truth)
        socket.on("voice:instance:sync", onInstanceSync);

        // Moderation events
        socket.on("voice:kicked", handleKicked);
        socket.on("voice:force:mute", onForceMute);
        socket.on("voice:force:unmute", onForceUnmute);
        socket.on("voice:terminate:rtc", onTerminateRTC);

        // Ephemeral events (non-structural)
        socket.on("voice:speaker:requested", onSpeakerRequested);
        socket.on("voice:speaker:declined", onSpeakerDeclined);
        socket.on("voice:user:speaking", onUserSpeaking);
        socket.on("voice:stage:locked", onStageLocked);
        socket.on("voice:stage:unlocked", onStageUnlocked);
        socket.on("voice:chat:message", onChatMessage);
        socket.on("voice:chat:toast", onChatToast); // ✅ ADDED: Toast listener
        socket.on("voice:chat:disabled", onChatDisabled);
        socket.on("voice:chat:enabled", onChatEnabled);
        socket.on("voice:chat:user:muted", onChatUserMuted);
        socket.on("voice:chat:user:unmuted", onChatUserUnmuted);
        socket.on("voice:recording:started", onRecordingStarted);
        socket.on("voice:recording:ready", onRecordingReady);
        socket.on("voice:room:ended", onRoomEnded);
        socket.on("voice:host:changed", onHostChanged);

        /* =====================================================
           CLEANUP - Using named handlers for each event
        ===================================================== */

        return () => {
            // Authoritative state sync
            socket.off("voice:instance:sync", onInstanceSync);

            // Moderation events
            socket.off("voice:kicked", handleKicked);
            socket.off("voice:force:mute", onForceMute);
            socket.off("voice:force:unmute", onForceUnmute);
            socket.off("voice:terminate:rtc", onTerminateRTC);

            // Ephemeral events
            socket.off("voice:speaker:requested", onSpeakerRequested);
            socket.off("voice:speaker:declined", onSpeakerDeclined);
            socket.off("voice:user:speaking", onUserSpeaking);
            socket.off("voice:stage:locked", onStageLocked);
            socket.off("voice:stage:unlocked", onStageUnlocked);
            socket.off("voice:chat:message", onChatMessage);
            socket.off("voice:chat:toast", onChatToast); // ✅ ADDED: Toast cleanup
            socket.off("voice:chat:disabled", onChatDisabled);
            socket.off("voice:chat:enabled", onChatEnabled);
            socket.off("voice:chat:user:muted", onChatUserMuted);
            socket.off("voice:chat:user:unmuted", onChatUserUnmuted);
            socket.off("voice:recording:started", onRecordingStarted);
            socket.off("voice:recording:ready", onRecordingReady);
            socket.off("voice:room:ended", onRoomEnded);
            socket.off("voice:host:changed", onHostChanged);
        };
    }, [enabled, dispatch, localUserId, instanceId, onKicked]); // 🔴 FIXED: Removed instance from deps!

    /* =====================================================
       EMIT HELPER
       ✅ Added safety check against stale instanceId
    ===================================================== */

    const emit = useCallback(
        (event, payload = {}) => {
            // ✅ Safety: Don't emit if no instanceId or we've been kicked/left
            if (!instanceId) {
                if (process.env.NODE_ENV === "development") {
                    console.warn(`[voice] Attempted to emit ${event} without instanceId`);
                }
                return;
            }

            // Don't emit if we've been kicked or manually left
            if (leftRef.current || !didJoinOkRef.current) {
                if (process.env.NODE_ENV === "development") {
                    console.warn(`[voice] Attempted to emit ${event} after leave/kick`);
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
                didJoinOkRef.current = false;
                joinedRef.current = false;
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