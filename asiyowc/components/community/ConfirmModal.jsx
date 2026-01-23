// components/community/ConfirmModal.jsx
import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import tw from "../../utils/tw";

export default function ConfirmModal({
  visible,
  title = "Are you sure?",
  message = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  danger = false,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={tw`flex-1 bg-black/40 items-center justify-center px-6`}>
        <View style={tw`bg-white rounded-2xl w-full p-6`}>
          {/* ================= TITLE ================= */}
          <Text
            style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 18,
              color: danger ? "#DC2626" : "#111827",
            }}
          >
            {title}
          </Text>

          {/* ================= MESSAGE ================= */}
          {!!message && (
            <Text
              style={{
                fontFamily: "Poppins-Regular",
                fontSize: 14,
                color: "#4B5563",
                marginTop: 8,
                lineHeight: 22,
              }}
            >
              {message}
            </Text>
          )}

          {/* ================= ACTIONS ================= */}
          <View style={tw`flex-row justify-end mt-6`}>
            <TouchableOpacity
              onPress={onCancel}
              style={tw`px-4 py-2 mr-3`}
            >
              <Text
                style={{
                  fontFamily: "Poppins-Medium",
                  fontSize: 14,
                  color: "#6B7280",
                }}
              >
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              style={[
                tw`px-5 py-2 rounded-lg`,
                danger ? tw`bg-red-600` : tw`bg-purple-600`,
              ]}
            >
              <Text
                style={{
                  fontFamily: "Poppins-Medium",
                  fontSize: 14,
                  color: "#FFFFFF",
                }}
              >
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
