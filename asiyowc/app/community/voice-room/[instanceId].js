import React, { useEffect, useState } from "react";
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

    const confirmLeave = () => {
        voiceRTC?.cleanup?.();
        voiceSocket?.leaveRoom();
        router.replace("/community");
    };


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
       DERIVED SAFE VALUES
    ===================================================== */
    const localUserId = user?._id ?? null;

    const canInit = Boolean(
        instanceId &&
        localUserId &&
        room &&
        instance
    );

    const canInitRTC = Boolean(
        instanceId &&
        localUserId &&
        instance
    );

    /* =====================================================
       SOCKET (STATE + CHAT + ROLES)
       - Hook always mounts
       - Only activates when enabled === true
    ===================================================== */
    const voiceSocket = useVoiceSocket({
        voiceId: room?._id,
        instanceId,
        enabled: canInit,
        token,
        localUserId: user?._id,
    });

    /* =====================================================
       WEBRTC (AUDIO ONLY)
    ===================================================== */
    const voiceRTC = useVoiceWebRTC({
        instanceId,
        enabled: canInitRTC,
        localUserId,

        onRemoteTrack: () => { },

        onSpeakingChange: (_userId, isSpeaking) => {
            voiceSocket?.setSpeaking?.(isSpeaking);
        },
    });

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

    /* =====================================================
       EXIT HANDLER
    ===================================================== */
    const handleLeave = () => {
        setShowLeaveConfirm(true);
    };

    /* =====================================================
       RENDER
    ===================================================== */
    return (
        <View style={{ flex: 1 }}>
            <VoiceRoomInterface
                voiceId={instanceId}
                currentUser={user}
                voiceState={voiceState}

                /* === SOCKET ACTIONS === */
                onRequestToSpeak={voiceSocket.requestToSpeak}
                onApproveSpeaker={voiceSocket.approveSpeaker}
                onDemoteSpeaker={voiceSocket.demoteSpeaker}
                onMuteUser={voiceSocket.muteUser}
                onUnmuteUser={voiceSocket.unmuteUser}
                onSendChatMessage={voiceSocket.sendChatMessage}
                onEnableChat={voiceSocket.enableChat}
                onDisableChat={voiceSocket.disableChat}
                onLockStage={voiceSocket.lockStage}
                onUnlockStage={voiceSocket.unlockStage}

                /* === LOCAL AUDIO === */
                onMuteSelf={voiceRTC.muteLocal}

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
