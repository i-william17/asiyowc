import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import tw from "../../utils/tw";

import {
    joinGroup,
    fetchGroupDetail,
    fetchGroupConversation,
} from "../../store/slices/communitySlice";

import { GBV_GROUP_ID } from "../../constants/systemGroups";
import GroupChatInterface from "../../components/community/GroupChatInterface";

export default function GBVForumScreen() {
    const dispatch = useDispatch();
    const router = useRouter();

    const { selectedGroup, selectedChat, loadingDetail } = useSelector(
        (s) => s.community
    );

    const [chatId, setChatId] = useState(null);

    /* =====================================================
       ENSURE MEMBERSHIP + RESOLVE CHAT ID
    ===================================================== */
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                /* 1️⃣ Ensure membership */
                const res = await dispatch(
                    joinGroup({ groupId: GBV_GROUP_ID })
                ).unwrap();

                if (!mounted) return;

                const resolvedChatId = res?.chatId;

                if (resolvedChatId) {
                    setChatId(resolvedChatId);

                    /* 2️⃣ Fetch conversation AFTER join */
                    dispatch(fetchGroupConversation(resolvedChatId));
                }

            } catch (err) {

                /* already member → load group */
                const group = await dispatch(fetchGroupDetail(GBV_GROUP_ID)).unwrap();

                if (!mounted) return;

                if (group?.chatId) {
                    setChatId(group.chatId);
                    await dispatch(fetchGroupConversation(group.chatId));
                }
            }
        };

        init();

        return () => {
            mounted = false;
        };
    }, [dispatch]);

    /* =====================================================
       WHEN GROUP IS LOADED, EXTRACT CHAT ID
    ===================================================== */
    // useEffect(() => {
    //     if (selectedGroup?.chatId && !chatId) {
    //         setChatId(selectedGroup.chatId);
    //         dispatch(fetchGroupConversation(selectedGroup.chatId));
    //     }
    // }, [selectedGroup]);

    /* =====================================================
       RENDER CHAT
    ===================================================== */
    /* =====================================================
       RENDER CHAT
    ===================================================== */
    return (
        <View style={tw`flex-1 bg-white`}>
            <GroupChatInterface
                chatId={chatId}
                isSystem
                disableInvites
                disableLeaving
                hideGroupInfo
                onLeave={() => {
                    if (Platform.OS === "web") {
                        router.replace("/more/safetyhub");
                    } else {
                        router.back();
                    }
                }}
            />

            {/* SAFETY NOTICE */}
            <View style={tw`px-4 py-3 bg-purple-50 border-t border-purple-100`}>
                <Text
                    style={[
                        tw`text-xs text-center text-gray-700`,
                        { fontFamily: "Poppins-Regular" },
                    ]}
                >
                    This is a private, confidential support space for GBV survivors.
                    Please be respectful, kind, and mindful. You are safe here.
                </Text>
            </View>
        </View>
    );
}