import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import tw from "../../utils/tw";
import LoadingBlock from "./LoadingBlock";
import EmptyState from "./EmptyState";
import {
  fetchChatDetail,
  sendChatMessage,
} from "../../store/slices/communitySlice";

export default function ChatInterface({ chatId, mode = "dm" }) {
  const dispatch = useDispatch();
  const { selectedChat, loadingDetail, sendingMessage } = useSelector(
    (s) => s.community
  );
  const user = useSelector((s) => s.auth.user);

  const [text, setText] = useState("");
  const listRef = useRef(null);

  const isGroup = mode === "group";

  /* =====================================================
     FETCH CHAT (UNCHANGED)
  ===================================================== */
  useEffect(() => {
    dispatch(fetchChatDetail(chatId));
  }, [chatId]);

  /* =====================================================
     AUTO SCROLL (UNCHANGED)
  ===================================================== */
  useEffect(() => {
    if (selectedChat?.messages?.length) {
      setTimeout(
        () => listRef.current?.scrollToEnd?.({ animated: true }),
        200
      );
    }
  }, [selectedChat?.messages?.length]);

  /* =====================================================
     SEND MESSAGE (UNCHANGED)
  ===================================================== */
  const onSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const payload = {
      ciphertext: trimmed,
      iv: "plain-iv",
      tag: "plain-tag",
      type: "text",
    };

    setText("");
    await dispatch(sendChatMessage({ chatId, payload }));
  };

  /* =====================================================
     STATES (UNCHANGED)
  ===================================================== */
  if (loadingDetail) return <LoadingBlock />;

  if (!selectedChat) {
    return (
      <EmptyState
        title="Chat not found"
        subtitle="This conversation is unavailable."
      />
    );
  }

  const messages = selectedChat.messages || [];

  /* =====================================================
     UI
  ===================================================== */
  return (
    <KeyboardAvoidingView
      style={tw`flex-1 bg-gray-50`}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ================= HEADER (NEW, SAFE) ================= */}
      <View style={tw`px-4 py-4 bg-white border-b border-gray-100`}>
        <Text
          style={{
            fontFamily: "Poppins-SemiBold",
            fontSize: 16,
          }}
        >
          {isGroup
            ? selectedChat?.group?.name || "Group Chat"
            : selectedChat?.title || "Chat"}
        </Text>

        {isGroup && (
          <Text style={tw`text-xs text-gray-500 mt-1`}>
            {selectedChat?.participants?.length || 0} members
          </Text>
        )}
      </View>

      {/* ================= MESSAGES ================= */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item._id || String(Math.random())}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        renderItem={({ item }) => {
          const isMe =
            String(item.sender?._id || item.sender) ===
            String(user?.id || user?._id);

          return (
            <View style={[tw`mb-3`, isMe ? tw`items-end` : tw`items-start`]}>
              <View
                style={[
                  tw`px-4 py-3 rounded-2xl max-w-[80%]`,
                  isMe
                    ? tw`bg-purple-600`
                    : isGroup
                    ? tw`bg-gray-200`
                    : tw`bg-white`,
                ]}
              >
                <Text
                  style={{
                    fontFamily: "Poppins-Regular",
                    color: isMe ? "white" : "#111827",
                  }}
                >
                  {item.ciphertext}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="No messages yet"
            subtitle="Say hi 👋 and start the conversation."
          />
        }
      />

      {/* ================= INPUT (UNCHANGED) ================= */}
      <View
        style={tw`absolute bottom-0 left-0 right-0 bg-white px-4 py-3 border-t border-gray-100 flex-row items-center`}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={
            isGroup ? "Message the group..." : "Type a message..."
          }
          placeholderTextColor="#9CA3AF"
          style={[
            tw`flex-1 bg-gray-100 rounded-2xl px-4 py-3 mr-3`,
            { fontFamily: "Poppins-Regular" },
          ]}
        />
        <TouchableOpacity
          onPress={onSend}
          disabled={sendingMessage}
          style={tw`bg-purple-600 rounded-2xl px-4 py-3`}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
