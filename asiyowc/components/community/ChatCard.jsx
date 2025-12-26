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
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import tw from "../../utils/tw";
import LoadingBlock from "./LoadingBlock";
import EmptyState from "./EmptyState";
import {
  fetchChatDetail,
  sendChatMessage,
} from "../../store/slices/communitySlice";

export default function ChatInterface({ chatId }) {
  const dispatch = useDispatch();
  const { selectedChat, loadingDetail, sendingMessage } = useSelector(
    (s) => s.community
  );
  const user = useSelector((s) => s.auth.user);

  const [text, setText] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (chatId) dispatch(fetchChatDetail(chatId));
  }, [chatId]);

  useEffect(() => {
    if (selectedChat?.messages?.length) {
      setTimeout(
        () => listRef.current?.scrollToEnd?.({ animated: true }),
        150
      );
    }
  }, [selectedChat?.messages?.length]);

  const onSend = async () => {
    if (!text.trim()) return;

    const payload = {
      ciphertext: text.trim(),
      iv: "plain-iv",
      tag: "plain-tag",
      type: "text",
    };

    setText("");
    dispatch(sendChatMessage({ chatId, payload }));
  };

  if (loadingDetail) return <LoadingBlock />;

  if (!selectedChat) {
    return (
      <EmptyState
        title="Chat not found"
        subtitle="This conversation is unavailable."
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={tw`flex-1 bg-gray-50`}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* HEADER */}
      <View style={tw`px-4 py-4 bg-white border-b`}>
        <Text style={tw`font-semibold text-base`}>
          {selectedChat.title || "Chat"}
        </Text>
      </View>

      {/* MESSAGES */}
      <FlatList
        ref={listRef}
        data={selectedChat.messages || []}
        keyExtractor={(m) => m._id}
        contentContainerStyle={tw`px-4 pt-4 pb-24`}
        renderItem={({ item }) => {
          const isMe =
            String(item.sender?._id || item.sender) ===
            String(user?._id);

          return (
            <View style={[tw`mb-3`, isMe ? tw`items-end` : tw`items-start`]}>
              <View
                style={[
                  tw`px-4 py-3 rounded-2xl max-w-[80%]`,
                  isMe ? tw`bg-purple-600` : tw`bg-white`,
                ]}
              >
                <Text style={{ color: isMe ? "white" : "#111827" }}>
                  {item.ciphertext}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* INPUT */}
      <View style={tw`absolute bottom-0 left-0 right-0 bg-white px-4 py-3 flex-row`}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          style={tw`flex-1 bg-gray-100 rounded-2xl px-4 py-3 mr-3`}
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
