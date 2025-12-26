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
          <Text
            style={[
              tw`text-lg font-semibold`,
              danger ? tw`text-red-600` : tw`text-gray-900`,
            ]}
          >
            {title}
          </Text>

          {!!message && (
            <Text style={tw`text-gray-600 mt-2 leading-6`}>
              {message}
            </Text>
          )}

          <View style={tw`flex-row justify-end mt-6`}>
            <TouchableOpacity
              onPress={onCancel}
              style={tw`px-4 py-2 mr-2`}
            >
              <Text style={tw`text-gray-600`}>
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
              <Text style={tw`text-white font-medium`}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
