import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { server } from "../../server"
import tw from "../../utils/tw";

export default function AiChatModal() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const { token } = useSelector((state) => state.auth); // adjust if needed

  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm Asiyo AI 🤖. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput("");
    setLoading(true);

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const res = await fetch(`${server}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // optional but recommended
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
      style={tw`flex-1 bg-white`}
    >
      {/* HEADER */}
      <View style={tw`flex-row items-center justify-between px-4 pt-12 pb-4 bg-purple-700`}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>

        <View style={tw`items-center`}>
          <Text style={tw`text-white font-bold text-lg`}>Asiyo AI</Text>
          <Text style={tw`text-green-300 text-xs`}>● Online</Text>
        </View>

        <Ionicons name="sparkles" size={22} color="#FFD700" />
      </View>

      {/* CHAT */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={tw`p-4`}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.map((m, i) => (
          <View
            key={i}
            style={[
              tw`max-w-[80%] p-3 rounded-2xl mb-3`,
              m.role === "user"
                ? tw`bg-purple-600 self-end`
                : tw`bg-gray-200 self-start`,
            ]}
          >
            <Text
              style={{
                color: m.role === "user" ? "#fff" : "#111",
                fontFamily: "Poppins-Regular",
              }}
            >
              {m.content}
            </Text>
          </View>
        ))}

        {loading && (
          <Text style={tw`text-gray-400 text-sm`}>
            Asiyo AI is typing…
          </Text>
        )}
      </ScrollView>

      {/* INPUT */}
      <View style={tw`flex-row items-center px-4 pb-6`}>
        <TextInput
          placeholder="Ask Asiyo AI..."
          value={input}
          onChangeText={setInput}
          style={tw`flex-1 border border-gray-300 rounded-xl p-3`}
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={tw`ml-3 bg-green-600 p-3 rounded-xl`}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
