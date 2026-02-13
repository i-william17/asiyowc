import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { X } from "lucide-react-native";
import tw from "../../utils/tw";

const PRIMARY = "#6A1B9A";
const SURFACE = "#FFFFFF";
const BORDER = "#EEEAF6";
const TEXT = "#111827";
const MUTED = "#6B7280";
const SOFT = "#EFE9F7";

const ModalShell = React.memo(({ visible, title, onClose, children }) => (
  <Modal visible={visible} transparent animationType="fade">
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={tw`flex-1`}>
        {/* Backdrop */}
        <TouchableOpacity
          style={[tw`absolute inset-0`, { backgroundColor: "rgba(0,0,0,0.35)" }]}
          onPress={onClose}
          activeOpacity={1}
        />
        {/* Sheet */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={tw`flex-1 justify-end`}
        >
          <View
            style={[
              tw`rounded-t-3xl p-4`,
              { backgroundColor: SURFACE, borderTopWidth: 1, borderColor: BORDER },
            ]}
          >
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <Text style={[tw`text-base`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
                {title}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  tw`w-10 h-10 rounded-full items-center justify-center`,
                  { backgroundColor: SOFT },
                ]}
              >
                <X size={18} color={PRIMARY} />
              </TouchableOpacity>
            </View>

            {children}
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
));

export default ModalShell;