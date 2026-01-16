/* =====================================================
   useVoiceSocket.js
   -----------------------------------------------------
   Voice Room Socket Hook
   - Handles signaling only (NO WebRTC)
   - Redux is the source of truth
   - Instance-based lifecycle
===================================================== */

import { useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { connectSocket } from "../services/socket";

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
}) {
    /* =====================================================
       INTERNAL REFS
    ===================================================== */

    const dispatch = useDispatch();

    const socketRef = useRef(null);
    const heartbeatRef = useRef(null);

    /**
     * Prevents double-joining on re-render
     * This is CRITICAL for React Strict Mode
     */
    const joinedRef = useRef(false);

    /* =====================================================
       DEBUG LOG
    ===================================================== */

    console.log("[voice] socket init", {
        voiceId,
        instanceId,
        enabled,
        token: token ? "present" : "missing",
    });

    /* =====================================================
       CONNECT + JOIN (INSTANCE SCOPED)
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
        if (joinedRef.current) return;

        joinedRef.current = true;

        /* =====================================================
           CONNECT SOCKET
        ===================================================== */

        const socket = connectSocket(token);
        socketRef.current = socket;

        console.log("[voice] socket connected");

        /* =====================================================
           JOIN INSTANCE
        ===================================================== */

        console.log("[voice] joining instance:", instanceId);

        socket.emit(
            "voice:join",
            { instanceId },
            (res) => {
                console.log("[voice] join response:", res);

                if (!res?.success) {
                    console.error("[voice] join failed", res);
                    joinedRef.current = false;
                    return;
                }

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
            }
        );

        /* =====================================================
           HEARTBEAT (KEEP ALIVE)
        ===================================================== */

        heartbeatRef.current = setInterval(() => {
            socket.emit("voice:heartbeat", { instanceId });
            dispatch(voiceHeartbeat());
        }, 15000);

        /* =====================================================
           CLEANUP ON UNMOUNT
        ===================================================== */

        return () => {
            console.log("[voice] leaving instance:", instanceId);

            joinedRef.current = false;

            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current);
                heartbeatRef.current = null;
            }

            socket.emit("voice:leave", { instanceId });
            socket.disconnect();

            dispatch(voiceLeft());
        };
    }, [enabled, instanceId, token, dispatch]);

    /* =====================================================
       RECONNECT HANDLING
    ===================================================== */

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;
        if (!instanceId) return;

        const handleReconnect = () => {
            if (!joinedRef.current) return;

            console.log("[voice] reconnecting instance:", instanceId);

            socket.emit(
                "voice:reconnect",
                { instanceId },
                (res) => {
                    if (!res?.success) {
                        console.warn("[voice] reconnect failed");
                        return;
                    }

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
                }
            );
        };

        socket.on("connect", handleReconnect);

        return () => {
            socket.off("connect", handleReconnect);
        };
    }, [instanceId, dispatch]);

    /* =====================================================
       SOCKET EVENT BINDINGS
    ===================================================== */

    useEffect(() => {
        if (!enabled) return;
        if (!socketRef.current) return;

        const socket = socketRef.current;

        /* =====================================================
           USER PRESENCE
        ===================================================== */

        socket.on("voice:user:joined", ({ userId, role }) => {
            dispatch(voiceUserJoined({ userId, role }));
        });

        socket.on("voice:user:left", ({ userId }) => {
            dispatch(voiceUserLeft({ userId }));
        });

        socket.on("voice:room:ended", () => {
            dispatch(voiceRoomEnded());
        });

        socket.on("voice:host:changed", ({ userId }) => {
            dispatch(voiceHostChanged({ userId }));
        });

        /* =====================================================
           SPEAKER / STAGE CONTROL
        ===================================================== */

        socket.on("voice:speaker:requested", ({ userId }) => {
            dispatch(voiceSpeakerRequested({ userId }));
        });

        socket.on("voice:speaker:approved", ({ userId }) => {
            dispatch(voiceSpeakerApproved({ userId }));
        });

        socket.on("voice:speaker:demoted", ({ userId }) => {
            dispatch(voiceSpeakerDemoted({ userId }));
        });

        socket.on("voice:stage:locked", () => {
            dispatch(voiceStageLocked());
        });

        socket.on("voice:stage:unlocked", () => {
            dispatch(voiceStageUnlocked());
        });

        /* =====================================================
           AUDIO SIGNALING (NO WEBRTC)
        ===================================================== */

        socket.on("voice:user:muted", ({ userId }) => {
            dispatch(voiceUserMuted({ userId }));
        });

        socket.on("voice:user:unmuted", ({ userId }) => {
            dispatch(voiceUserUnmuted({ userId }));
        });

        socket.on("voice:user:speaking", ({ userId, isSpeaking }) => {
            dispatch(voiceUserSpeaking({ userId, isSpeaking }));
        });

        /* =====================================================
           CHAT EVENTS
        ===================================================== */

        socket.on("voice:chat:message", (payload) => {
            dispatch(voiceChatMessageReceived(payload));
        });

        socket.on("voice:chat:disabled", () => {
            dispatch(voiceChatDisabled());
        });

        socket.on("voice:chat:enabled", () => {
            dispatch(voiceChatEnabled());
        });

        socket.on("voice:chat:user:muted", ({ userId }) => {
            dispatch(voiceChatUserMuted({ userId }));
        });

        socket.on("voice:chat:user:unmuted", ({ userId }) => {
            dispatch(voiceChatUserUnmuted({ userId }));
        });

        /* =====================================================
           RECORDING EVENTS
        ===================================================== */

        socket.on("voice:recording:started", () => {
            dispatch(voiceRecordingStarted());
        });

        socket.on("voice:recording:ready", ({ replayUrl }) => {
            dispatch(voiceRecordingReady({ replayUrl }));
        });

        /* =====================================================
           MODERATION EVENTS
        ===================================================== */

        socket.on("voice:user:kicked", ({ userId }) => {
            dispatch(voiceUserRemoved({ userId }));
        });

        socket.on("voice:user:banned", ({ userId }) => {
            dispatch(voiceUserBanned({ userId }));
        });

        /* =====================================================
           CLEANUP
        ===================================================== */

        return () => {
            socket.removeAllListeners();
        };
    }, [enabled, dispatch]);

    /* =====================================================
       EMIT HELPER
    ===================================================== */

    const emit = useCallback(
        (event, payload = {}) => {
            socketRef.current?.emit(event, {
                instanceId,
                ...payload,
            });
        },
        [instanceId]
    );

    /* =====================================================
       PUBLIC API
    ===================================================== */

    return {
        /* ===== SPEAKING ===== */
        requestToSpeak: () => emit("voice:request:speak"),
        approveSpeaker: (userId) =>
            emit("voice:approve:speaker", { userId }),
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
        leaveRoom: () => emit("voice:leave"),

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
