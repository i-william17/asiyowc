import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { server } from "../../server";
import tw from "../../utils/tw";

export default function AiChatModal() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const { token } = useSelector((state) => state.auth);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm Asiyo AI. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  /* ================= TYPING ANIMATION ================= */
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) return;

    const animateDot = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 350,
            delay,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = animateDot(dot1, 0);
    const a2 = animateDot(dot2, 150);
    const a3 = animateDot(dot3, 300);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      dot1.stopAnimation();
      dot2.stopAnimation();
      dot3.stopAnimation();
    };
  }, [loading]);

  /* ================= SEND MESSAGE ================= */
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const res = await fetch(`${server}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollToEnd({ animated: true })
      );
    }
  };

  /* ================= UI ================= */
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
      style={tw`flex-1 bg-gray-50`}
    >
      {/* ================= HEADER ================= */}
      <View
        style={{
          backgroundColor: "#6A1B9A",
          paddingTop: 56,
          paddingBottom: 22,
          paddingHorizontal: 16,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          elevation: 8,
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 12,
        }}
      >
        <View style={tw`flex-row items-center justify-between`}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={tw`items-center`}>
            <Text style={{ fontFamily: "Poppins-Bold", fontSize: 18, color: "#FFFFFF" }}>
              Asiyo AI
            </Text>
            <Text style={{ fontFamily: "Poppins-Regular", fontSize: 12, color: "#E9D5FF" }}>
              Your intelligent assistant
            </Text>
          </View>

          <Ionicons name="sparkles" size={22} color="#FFD700" />
        </View>
      </View>

      {/* ================= CHAT ================= */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={tw`px-4 pt-4 pb-28`}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.map((m, i) => {
          const isUser = m.role === "user";

          return (
            <View
              key={i}
              style={[
                tw`mb-4 max-w-[82%]`,
                isUser ? tw`self-end` : tw`self-start`,
              ]}
            >
              <View
                style={[
                  tw`px-4 py-3 rounded-2xl`,
                  isUser
                    ? tw`bg-purple-600`
                    : tw`bg-white border border-gray-200`,
                ]}
              >
                <Text
                  style={{
                    fontFamily: "Poppins-Regular",
                    fontSize: 14,
                    lineHeight: 20,
                    color: isUser ? "#FFFFFF" : "#111827",
                  }}
                >
                  {m.content}
                </Text>
              </View>
            </View>
          );
        })}

        {/* ================= TYPING INDICATOR ================= */}
        {loading && (
          <View style={tw`mt-2 self-start flex-row items-center px-4 py-3 bg-white border border-gray-200 rounded-2xl`}>
            <Text style={{ fontFamily: "Poppins-Regular", fontSize: 13, color: "#6B7280", marginRight: 8 }}>
              Asiyo AI
            </Text>

            {[dot1, dot2, dot3].map((dot, idx) => (
              <Animated.Text
                key={idx}
                style={{
                  fontSize: 20,
                  marginHorizontal: 2,
                  color: "#6A1B9A",
                  opacity: dot,
                  transform: [
                    {
                      scale: dot.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.1],
                      }),
                    },
                  ],
                }}
              >
                •
              </Animated.Text>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ================= INPUT ================= */}
      <View style={tw`absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex-row items-center`}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask Asiyo AI…"
          placeholderTextColor="#9CA3AF"
          multiline
          style={[
            tw`flex-1 bg-gray-100 rounded-full px-4 py-3 mr-3`,
            { fontFamily: "Poppins-Regular", maxHeight: 120 },
          ]}
        />

        <TouchableOpacity
          onPress={sendMessage}
          activeOpacity={0.85}
          style={tw`bg-purple-600 rounded-full p-3`}
        >
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
