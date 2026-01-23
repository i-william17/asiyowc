import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
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

        (async () => {
            try {
                // 1️⃣ Try joining (works if NOT a member)
                const res = await dispatch(joinGroup(GBV_GROUP_ID)).unwrap();

                if (!mounted) return;

                if (res?.chatId) {
                    setChatId(res.chatId);
                    dispatch(fetchGroupConversation(res.chatId));
                    return;
                }
            } catch (err) {
                // 2️⃣ Already a member → fetch group
                await dispatch(fetchGroupDetail(GBV_GROUP_ID)).unwrap();

                if (!mounted) return;
            }
        })();

        return () => {
            mounted = false;
        };
    }, [dispatch]);

    /* =====================================================
       WHEN GROUP IS LOADED, EXTRACT CHAT ID
    ===================================================== */
    useEffect(() => {
        if (selectedGroup?.chatId && !chatId) {
            setChatId(selectedGroup.chatId);
            dispatch(fetchGroupConversation(selectedGroup.chatId));
        }
    }, [selectedGroup]);

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
                onLeave={() => router.replace("/more/safetyhub")}
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
