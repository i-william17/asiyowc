import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../utils/tw';

export default function AiChatModal() {
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi! I'm Asiyo AI. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;

    setMessages([...messages, { from: 'user', text: input }]);
    setInput("");

    // fake bot response for now
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        from: 'bot',
        text: "I'm still learning! But your message was: " + input
      }]);
    }, 800);
  };

  return (
    <View style={tw`flex-1 bg-white p-4`}>
      <Text style={{ fontFamily: "Poppins-Bold", fontSize: 22 }}>
        Asiyo AI Assistant 🤖
      </Text>

      <ScrollView style={tw`mt-4 flex-1`}>
        {messages.map((m, idx) => (
          <View
            key={idx}
            style={[
              tw`p-3 rounded-xl mb-2`,
              m.from === "user"
                ? tw`bg-purple-600 self-end`
                : tw`bg-gray-200 self-start`
            ]}
          >
            <Text
              style={{
                color: m.from === "user" ? "#fff" : "#111",
                fontFamily: "Poppins-Regular",
              }}
            >
              {m.text}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Input Row */}
      <View style={tw`flex-row items-center mt-3`}>
        <TextInput
          placeholder="Type a message..."
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
    </View>
  );
}
