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
  Modal,
  Alert,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { server } from "../../server";
import tw from "../../utils/tw";
import { useAiStream } from "../../hooks/useAiStream";

export default function AnonymousSupportChatModal({ onClose }) {
  const router = useRouter();
  const scrollRef = useRef(null);
  const { token } = useSelector((state) => state.auth);

  const renderBoldText = (text) => {
    const parts = text.split("**");

    return parts.map((part, index) => {
      // Odd indexes = bold text
      if (index % 2 === 1) {
        return (
          <Text key={index} style={{ fontFamily: "Poppins-SemiBold" }}>
            {part}
          </Text>
        );
      }

      // Even indexes = normal text
      return (
        <Text key={index} style={{ fontFamily: "Poppins-Regular" }}>
          {part}
        </Text>
      );
    });
  };

  /* ================= ANONYMOUS STATE ================= */
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "This is a safe, anonymous space. You can share freely. I’m here to listen.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const { clearAiMemory } = useAiStream({
    token,
    onChunk: (chunk) => {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].content += chunk;
        return updated;
      });
    },
    onDone: () => {
      setLoading(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollToEnd({ animated: true })
      );
    },
    onError: () => {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please take a breath and try again.",
        },
      ]);
    },
  });

  const handleClose = () => {
    clearAiMemory();        // ✅ clears backend AI context
    setMessages([
      {
        role: "assistant",
        content:
          "This is a safe, anonymous space. You can share freely. I’m here to listen.",
      },
    ]);
    setInput("");
    setLoading(false);
    onClose?.();
  };

  const copyMessage = async (text) => {
    try {
      await Clipboard.setStringAsync(text);
    } catch (err) {
      console.warn("Copy failed", err);
    }
  };
  /* ================= QUICK SUGGESTIONS ================= */
  const suggestions = [
    "I feel low and need someone to talk to",
    "I need affirmation and encouragement",
    "I am feeling overwhelmed",
    "I think I’m getting depressed",
    "I just need to share what I’m going through",
    "I need help processing my emotions",
  ];

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

  useEffect(() => {
    return () => {
      // 🔥 Runs when modal unmounts
      clearAiMemory();
      setMessages([
        {
          role: "assistant",
          content:
            "This is a safe, anonymous space. You can share freely. I’m here to listen.",
        },
      ]);
      setInput("");
      setLoading(false);
    };
  }, [clearAiMemory]);


  /* ================= SEND MESSAGE ================= */
  const sendMessage = async (textOverride) => {
    const messageToSend = textOverride ?? input.trim();
    if (!messageToSend || loading) return;

    setInput("");
    setLoading(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: messageToSend },
      { role: "assistant", content: "" }, // placeholder for streaming
    ]);

    try {
      const res = await fetch(`${server}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: messageToSend }),
      });

      if (!res.ok) {
        throw new Error("AI request failed");
      }
    } catch (error) {
      console.error("AI chat error:", error);
      setLoading(false);
    }
  };


  /* ================= SUGGESTION TAP ================= */
  const sendSuggestion = (text) => {
    if (loading) return;
    sendMessage(text);
  };


  /* ================= UI ================= */
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
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
          }}
        >
          <View style={tw`flex-row items-center justify-between`}>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={tw`items-center`}>
              <Text
                style={{
                  fontFamily: "Poppins-Bold",
                  fontSize: 18,
                  color: "#FFFFFF",
                }}
              >
                Anonymous Support
              </Text>
              <Text
                style={{
                  fontFamily: "Poppins-Regular",
                  fontSize: 12,
                  color: "#E9D5FF",
                }}
              >
                Safe • Private • Judgment-free
              </Text>
            </View>

            <MaterialIcons name="privacy-tip" size={22} color="#FFD700" />
          </View>
        </View>

        {/* ================= CHAT ================= */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={tw`px-4 pt-4 pb-40`}
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
                      fontSize: 14,
                      lineHeight: 20,
                      color: isUser ? "#FFFFFF" : "#111827",
                    }}
                  >
                    {renderBoldText(m.content)}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* ================= TYPING ================= */}
          {loading && (
            <View
              style={tw`mt-2 self-start flex-row items-center px-4 py-3 bg-white border border-gray-200 rounded-2xl`}
            >
              <Text
                style={{
                  fontFamily: "Poppins-Regular",
                  fontSize: 13,
                  color: "#6B7280",
                  marginRight: 8,
                }}
              >
                Support
              </Text>

              {[dot1, dot2, dot3].map((dot, idx) => (
                <Animated.Text
                  key={idx}
                  style={{
                    fontSize: 20,
                    marginHorizontal: 2,
                    color: "#6A1B9A",
                    opacity: dot,
                  }}
                >
                  •
                </Animated.Text>
              ))}
            </View>
          )}
        </ScrollView>

        {/* ================= SUGGESTIONS ================= */}
        <View style={tw`px-4 pb-2`}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`gap-2`}
          >
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => sendSuggestion(s)}
                style={tw`px-4 py-2 bg-purple-100 rounded-full`}
                activeOpacity={0.85}
              >
                <Text style={tw`text-purple-700 text-sm font-poppins-regular`}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ================= INPUT ================= */}
        <View
          style={tw`bg-white border-t border-gray-200 px-4 py-3`}
        >
          <View style={tw`flex-row items-center`}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Share what’s in your heart…"
              placeholderTextColor="#9CA3AF"
              multiline
              style={[
                tw`flex-1 bg-gray-100 rounded-full px-4 py-3 mr-3`,
                { fontFamily: "Poppins-Regular", maxHeight: 120 },
              ]}
            />

            <TouchableOpacity
              onPress={() => sendMessage()}
              activeOpacity={0.85}
              style={tw`bg-purple-600 rounded-full p-3`}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* ================= ANONYMITY NOTICE ================= */}
          <Text
            style={tw`text-xs text-gray-500 text-center mt-2 font-poppins-regular`}
          >
            This chat is anonymous and safe. When you close this chat, the entire
            conversation is permanently deleted. Share freely
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
