// app/community/voice/[instanceId].js
import React, { useEffect, useState, useCallback, useMemo } from "react";
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

    const voiceState = {
        room,
        instance,
        role,
        messages,
        speakingUsers,
        chatEnabled,
        lockedStage,
    };

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
    ===================================================== */
    const localUserId = user?._id ?? null;

    // ✅ FIX #1: Check if instance is fully hydrated AND matches current instanceId
    const isInstanceReady = Boolean(
        instance?.instanceId &&
        Array.isArray(instance?.speakers) &&
        String(instance.instanceId) === String(instanceId)
    );

    // ✅ FIX #2: Check if room is loaded
    const isRoomReady = Boolean(room?._id);

    // ✅ FIX #3: Check if user is authenticated
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
       SOCKET (STATE + CHAT + ROLES)
    ===================================================== */
    const voiceSocket = useVoiceSocket({
        voiceId: room?._id,
        instanceId,
        enabled: canInit, // Only enable when all data is ready
        token,
        localUserId: user?._id,
    });

    // ✅ Track socket connection state
    const isSocketConnected = voiceSocket?.isConnected ?? false;

    // ✅ Track first successful connection
    useEffect(() => {
        if (isSocketConnected) {
            setHasEverConnected(true);
        }
    }, [isSocketConnected]);

    // ✅ WebRTC enabled only when socket is connected
    const webrtcEnabled = Boolean(
        canInit && // All data is ready
        isSocketConnected // Socket is actually connected
    );

    /* =====================================================
       WEBRTC (AUDIO ONLY) - FIXED with proper guards
    ===================================================== */
    const voiceRTC = useVoiceWebRTC({
        instanceId,
        enabled: webrtcEnabled, // Only enable when socket is connected
        localUserId,
        token,
        initialSpeakers: speakers,
        isSocketConnected, // Pass socket connection state to WebRTC

        onRemoteTrack: useCallback((userId, stream) => {
            console.log("[voice] remote track received:", userId);
        }, []),

        // ✅ FIX #4: Only emit speaking state for local user
        onSpeakingChange: useCallback((userId, isSpeaking) => {
            // Only update speaking state for local user (to broadcast to others)
            if (userId === localUserId) {
                voiceSocket?.setSpeaking?.(isSpeaking);
            }
        }, [voiceSocket, localUserId]),
    });

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
            instanceMatches: instance?._id === instanceId
        });

        console.log("CHECK:", {
            instanceId,
            instanceIdFromStore: instance?._id,
            isUserReady,
            isRoomReady,
            isInstanceReady,
        });
    }, [canInit, isSocketConnected, hasEverConnected, webrtcEnabled, speakers.length, instanceId, localUserId, instance?._id]);


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

    if (!room || !instance) {
        return <LoadingBlock text="Joining live voice room…" />;
    }

    // ✅ FIX #5: Only show full-screen Connecting on first entry
    // Mid-session disconnects will be handled by VoiceRoomInterface with a banner
    if (canInit && !isSocketConnected && !hasEverConnected) {
        return <LoadingBlock text="Connecting to voice room…" />;
    }

    /* =====================================================
       RENDER
    ===================================================== */
    return (
        <View style={{ flex: 1 }}>
            <VoiceRoomInterface
                voiceId={instanceId}
                currentUser={user}
                voiceState={voiceState}

                /* === Connection Status === */
                isConnected={isSocketConnected}
                isWebRTCReady={webrtcEnabled}
                hasEverConnected={hasEverConnected} // Pass down for UI decisions

                /* === SOCKET ACTIONS === */
                onRequestToSpeak={voiceSocket?.requestToSpeak}
                onApproveSpeaker={voiceSocket?.approveSpeaker}
                onDemoteSpeaker={voiceSocket?.demoteSpeaker}
                onMuteUser={voiceSocket?.muteUser}
                onUnmuteUser={voiceSocket?.unmuteUser}
                onSendChatMessage={voiceSocket?.sendChatMessage}
                onEnableChat={voiceSocket?.enableChat}
                onDisableChat={voiceSocket?.disableChat}
                onLockStage={voiceSocket?.lockStage}
                onUnlockStage={voiceSocket?.unlockStage}

                /* === LOCAL AUDIO === */
                onMuteSelf={voiceRTC.muteLocal}
                isMuted={voiceRTC.isMuted} // You'll need to add this to your hook

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