// app/community/voice/[instanceId].js
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import { fetchVoiceInstance } from "../../../store/slices/communitySlice";

import VoiceRoomInterface from "../../../components/community/VoiceRoomInterface";
import { useVoiceSocket } from "../../../hooks/useVoiceSocket";
import { useVoiceWebRTC } from "../../../hooks/useVoiceWebRTC";
import LoadingBlock from "../../../components/community/LoadingBlock";
import EmptyState from "../../../components/community/EmptyState";
import ConfirmModal from "../../../components/community/ConfirmModal";

/* =====================================================
   LIVE VOICE ROOM (INSTANCE)
===================================================== */

export default function VoiceRoomScreen() {
    const { instanceId } = useLocalSearchParams();
    const router = useRouter();
    const dispatch = useDispatch();

    /* =====================================================
       AUTH
    ===================================================== */
    const user = useSelector((s) => s.auth.user);
    const token = useSelector((s) => s.auth.token);

    /* =====================================================
       COMMUNITY STATE (⚠️ STABLE SELECTORS)
    ===================================================== */
    const room = useSelector((s) => s.community.room);
    const instance = useSelector((s) => s.community.instance);
    const role = useSelector((s) => s.community.role);
    const messages = useSelector((s) => s.community.messages);
    const speakingUsers = useSelector((s) => s.community.speakingUsers);
    const chatEnabled = useSelector((s) => s.community.chatEnabled);
    const lockedStage = useSelector((s) => s.community.lockedStage);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    const voiceState = useMemo(() => ({
        room,
        instance,
        role,
        messages,
        speakingUsers,
        chatEnabled,
        lockedStage,
    }), [
        room,
        instance,
        role,
        messages,
        speakingUsers,
        chatEnabled,
        lockedStage,
    ]);

    /* =====================================================
       FETCH INSTANCE (ONCE)
    ===================================================== */
    useEffect(() => {
        if (instanceId) {
            dispatch(fetchVoiceInstance(instanceId));
            console.log("[voice] fetching instance:", instanceId);
        }
    }, [instanceId, dispatch]);

    /* =====================================================
       TRACK FIRST CONNECTION (for UX hardening)
    ===================================================== */
    const [hasEverConnected, setHasEverConnected] = useState(false);

    /* =====================================================
       DERIVED SAFE VALUES
       🔴 FIX #1: Use consistent localUserId
       🔴 FIX #2: Fix instance comparison
    ===================================================== */
    const localUserId = useMemo(() => user?._id ?? null, [user]);

    // Check if instance is fully hydrated AND matches current instanceId
    const isInstanceReady = Boolean(
        instance?.instanceId &&
        Array.isArray(instance?.speakers) &&
        String(instance.instanceId) === String(instanceId)
    );

    // Check if room is loaded
    const isRoomReady = Boolean(room?._id);

    // Check if user is authenticated
    const isUserReady = Boolean(localUserId && token);

    // All data ready for socket connection
    const canInit = Boolean(
        instanceId &&
        isUserReady &&
        isRoomReady &&
        isInstanceReady
    );

    /* =====================================================
       GET SPEAKERS FROM BACKEND'S instance.speakers
    ===================================================== */
    const speakers = useMemo(() => {
        if (!instance?.speakers) return [];
        return instance.speakers;
    }, [instance?.speakers]);

    /* =====================================================
       STABLE VOICE ID (prevents noisy logs)
       🔴 FIX (optional): Stabilize voiceId
    ===================================================== */
    const stableVoiceId = useMemo(() => {
        return room?._id ?? instance?.voiceId ?? null;
    }, [room, instance]);

    /* =====================================================
       🔴 CRITICAL FIX: Ref bridge for WebRTC instance
       Allows onKicked to access voiceRTC even though it's declared later
    ===================================================== */
    const rtcRef = useRef(null);

    /* =====================================================
       SOCKET (STATE + CHAT + ROLES)
       🔴 FIX #1: Pass consistent localUserId
       🔴 FIX #1 (kicked navigation): Add onKicked handler
       🔴 CRITICAL FIX: Use rtcRef.current instead of voiceRTC directly
    ===================================================== */
    const voiceSocket = useVoiceSocket({
        voiceId: stableVoiceId,
        instanceId,
        enabled: Boolean(instanceId && token && localUserId),
        token,
        localUserId, // ✅ Using memoized consistent value
        // 🔴 FIX 1: Add onKicked navigation handler with ref bridge
        onKicked: () => {
            console.log("[voice] kicked - navigating out");
            
            // ✅ Use ref to access WebRTC instance (safe from closure timing)
            if (rtcRef.current) {
                rtcRef.current.cleanup?.(true);
            }
            
            router.replace("/community");
        }
    });

    // Track socket connection state
    const isSocketConnected = voiceSocket?.isConnected ?? false;

    // Track first successful connection
    useEffect(() => {
        if (isSocketConnected) {
            setHasEverConnected(true);
        }
    }, [isSocketConnected]);

    // ✅ WebRTC enabled only when socket is connected
    const webrtcEnabled = Boolean(
        instanceId &&
        token &&
        localUserId &&
        isSocketConnected
    );

    /* =====================================================
       WEBRTC (AUDIO ONLY) - FIXED with proper props
       ✅ REMOVED: initialSpeakers, isSocketConnected (no longer used)
       ✅ FIXED: onSpeakingChange now passes through all speakers
    ===================================================== */
    const voiceRTC = useVoiceWebRTC({
        instanceId,
        enabled: webrtcEnabled,
        localUserId,
        token,

        onRemoteTrack: useCallback((userId, stream) => {
            console.log("[voice] remote track received:", userId);
        }, []),

        // ✅ FIX #2: Remove local-only filter - pass through all speakers
        onSpeakingChange: useCallback((userId, isSpeaking) => {
            if (userId === localUserId) {
                voiceSocket?.setSpeaking?.(isSpeaking);
            }
        }, [voiceSocket, localUserId]),
    });

    /* =====================================================
       🔴 CRITICAL FIX: Sync WebRTC instance to ref
       This ensures onKicked always has access to the latest voiceRTC
    ===================================================== */
    useEffect(() => {
        rtcRef.current = voiceRTC;
    }, [voiceRTC]);

    /* =====================================================
       EXIT HANDLER
    ===================================================== */
    const confirmLeave = useCallback(() => {
        console.log("[voice] leaving room, cleaning up...");

        // Clean up WebRTC first
        if (voiceRTC) {
            voiceRTC.cleanup?.(true); // Final cleanup
        }

        // Leave the room via socket
        if (voiceSocket) {
            voiceSocket.leaveRoom?.();
        }

        // Navigate away
        router.replace("/community");
    }, [voiceRTC, voiceSocket, router]);

    const handleLeave = useCallback(() => {
        setShowLeaveConfirm(true);
    }, []);

    /* =====================================================
       LOGGING FOR DEBUGGING
       🔴 FIX #2: Fixed instance comparison
       🔴 FIX #3: Defensive isPeerConnected check
    ===================================================== */
    useEffect(() => {
        console.log("[voice] State:", {
            canInit,
            isSocketConnected,
            hasEverConnected,
            webrtcEnabled,
            speakerCount: speakers.length,
            instanceId,
            userId: localUserId,
            // ✅ FIX #2: Compare instance.instanceId, not instance._id
            instanceMatches: String(instance?.instanceId) === String(instanceId),
            // ✅ FIX #3: Defensive check for isPeerConnected
            liveKitConnected: voiceRTC?.isPeerConnected?.() ?? false,
            // 🔴 FIX 2: Log output mute state
            outputMuted: voiceRTC?.outputMuted ?? false,
        });
    }, [
        canInit,
        isSocketConnected,
        hasEverConnected,
        webrtcEnabled,
        speakers.length,
        instanceId,
        localUserId,
        instance?.instanceId, // ✅ Changed from instance?._id
        voiceRTC
    ]);

    /* =====================================================
       HARD GUARDS (SAFE)
    ===================================================== */
    if (!instanceId) {
        return (
            <EmptyState
                title="Invalid room"
                subtitle="Voice instance not found."
            />
        );
    }

    if (!user || !user._id) {
        return <LoadingBlock text="Loading user…" />;
    }

    if (!instance?.instanceId) {
        return <LoadingBlock text="Joining live voice room…" />;
    }

    // Only show full-screen Connecting on first entry
    // Mid-session disconnects will be handled by VoiceRoomInterface with a banner
    if (canInit && !isSocketConnected && !hasEverConnected) {
        return <LoadingBlock text="Connecting to voice room…" />;
    }

    /* =====================================================
       RENDER
       ✅ FIX #3: Use actual LiveKit connection for readiness (defensive)
       🔴 FIX 2: Add output mute props to VoiceRoomInterface
    ===================================================== */
    return (
        <View style={{ flex: 1 }}>
            <VoiceRoomInterface
                voiceId={instanceId}
                currentUser={user}
                voiceState={voiceState}

                /* === Connection Status === */
                isConnected={isSocketConnected}
                // ✅ FIX #3: Defensive check for isPeerConnected
                isWebRTCReady={voiceRTC?.isPeerConnected?.() ?? false}
                hasEverConnected={hasEverConnected} // Pass down for UI decisions

                /* === SOCKET ACTIONS === */
                onRequestToSpeak={voiceSocket?.requestToSpeak}
                onApproveSpeaker={voiceSocket?.approveSpeaker}
                onDemoteSpeaker={voiceSocket?.demoteSpeaker}
                onRemoveUser={voiceSocket?.kickUser} // ✅ Added for moderation modal
                onMuteUser={voiceSocket?.muteUser}
                onUnmuteUser={voiceSocket?.unmuteUser}
                onSendChatMessage={voiceSocket?.sendChatMessage}
                onEnableChat={voiceSocket?.enableChat}
                onDisableChat={voiceSocket?.disableChat}
                onLockStage={voiceSocket?.lockStage}
                onUnlockStage={voiceSocket?.unlockStage}

                /* === LOCAL AUDIO === */
                onMuteSelf={voiceRTC?.muteLocal}
                isMuted={voiceRTC?.isMuted ?? false}
                
                /* === OUTPUT AUDIO === */
                onToggleOutputMute={voiceRTC?.toggleOutputMute}
                isOutputMuted={voiceRTC?.outputMuted ?? false}

                /* === EXIT === */
                onLeave={handleLeave}
            />

            <ConfirmModal
                visible={showLeaveConfirm}
                title="Leave voice room?"
                message="You will stop hearing and speaking in this room."
                confirmText="Leave"
                danger
                onCancel={() => setShowLeaveConfirm(false)}
                onConfirm={confirmLeave}
            />
        </View>
    );
}