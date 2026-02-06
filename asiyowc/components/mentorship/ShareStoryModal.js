import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from "react-native";
import * as Haptics from "expo-haptics";

import { useDispatch, useSelector } from "react-redux";
import { addStory } from "../../store/slices/mentorshipSlice";

import { LinearGradient } from "expo-linear-gradient";
import {
  X,
  Type,
  FileText,
  Link,
  AlertCircle,
  CheckCircle,
  PenTool,
  Clock,
} from "lucide-react-native";
import tw from "../../utils/tw";

/* ============================================================
   CONFIG & CONSTANTS
============================================================ */
const MAX_CHARS = 1500;
const IMAGE_URL_REGEX = /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif|bmp)(\?.*)?$/i;

/* ============================================================
   UI COMPONENTS
============================================================ */
const InputField = React.memo(function InputField({
  icon: Icon,
  placeholder,
  value,
  onChangeText,
  error,
  multiline = false,
  maxLength,
  returnKeyType = "next",
  onSubmitEditing,
  inputRef,
  ...props
}) {
  return (
    <View style={tw`mb-4`}>
      <View style={tw`flex-row items-center mb-2`}>
        <Icon size={16} color={error ? "#EF4444" : "#6B7280"} />
        <Text
          style={[
            tw`ml-2 text-sm`,
            { fontFamily: "Poppins-Medium" },
            error ? tw`text-red-600` : tw`text-gray-700`,
          ]}
        >
          {placeholder}
        </Text>
      </View>

      <TextInput
        ref={inputRef}
        style={[
          tw`bg-white rounded-lg border px-4 py-3.5`,
          multiline && tw`min-h-[120px] text-left align-top`,
          error ? tw`border-red-300 bg-red-50` : tw`border-purple-100`,
          { fontFamily: "Poppins-Regular" },
        ]}
        placeholder={`Enter ${placeholder.toLowerCase()}`}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        maxLength={maxLength}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        selectionColor="#6A1B9A"
        cursorColor="#6A1B9A"
        {...props}
      />

      {error && (
        <View style={tw`flex-row items-center mt-1.5`}>
          <AlertCircle size={14} color="#EF4444" />
          <Text
            style={[
              tw`text-red-600 text-xs ml-1.5`,
              { fontFamily: "Poppins-Regular" },
            ]}
          >
            {error}
          </Text>
        </View>
      )}
    </View>
  );
});

export default function ShareStoryModal({
  visible,
  onClose,
}) {
  const dispatch = useDispatch();
  const { loading } = useSelector((s) => s.mentorship);
  const { token, user } = useSelector((s) => s.auth);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [errors, setErrors] = useState({});

  // Refs
  const titleRef = useRef();
  const contentRef = useRef();
  const imageRef = useRef();

  /* ============================================================
     VALIDATION
  ============================================================ */
  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!title.trim()) {
      newErrors.title = "Story title is required";
    } else if (title.trim().length < 5) {
      newErrors.title = "Title should be at least 5 characters";
    } else if (title.trim().length > 100) {
      newErrors.title = "Title should be less than 100 characters";
    }

    if (!content.trim()) {
      newErrors.content = "Story content is required";
    } else if (content.trim().length < 100) {
      newErrors.content = "Story should be at least 100 characters";
    } else if (content.trim().length > MAX_CHARS) {
      newErrors.content = `Story exceeds ${MAX_CHARS} character limit`;
    }

    // Optional image validation
    if (image.trim() && !IMAGE_URL_REGEX.test(image.trim())) {
      newErrors.image = "Please enter a valid image URL (jpg, png, webp, gif, bmp)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ============================================================
     HANDLERS
  ============================================================ */
  const reset = () => {
    setTitle("");
    setContent("");
    setImage("");
    setErrors({});
  };

  const handleClose = () => {
    if (title.trim() || content.trim()) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to close?",
        [
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              reset();
              onClose();
            }
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } else {
      reset();
      onClose();
    }
  };

  const submit = async () => {
    // Prevent double submit
    if (loading) return;

    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Missing Information",
        "Please fill in all required fields correctly",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const result = await dispatch(
        addStory({
          payload: {
            title: title.trim(),
            content: content.trim(),
            image: image.trim() || undefined,
            ...(user?.profile?.fullName && {
              author: {
                name: user.profile.fullName,
                avatar: user?.profile?.avatar?.url
              }
            })
          },
          token,
        })
      ).unwrap();

      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        "🎉 Success!",
        "Your inspiring story has been shared with the community.",
        [
          {
            text: "Continue",
            onPress: () => {
              reset();
              onClose();
            }
          }
        ]
      );
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        err.message || "Unable to post story. Please try again."
      );
    }
  };

  /* ============================================================
     CALCULATIONS
  ============================================================ */
  const remainingChars = MAX_CHARS - content.length;
  const canSubmit = !loading && title.trim().length > 0 && content.trim().length > 0;

  // Character counter color logic
  const counterColor =
    remainingChars < 100
      ? "#EF4444"  // Red for critical
      : remainingChars < 300
        ? "#D97706" // Amber for warning
        : "#6A1B9A"; // Purple for normal

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const isOverLimit = wordCount > 1000;

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      importantForAccessibility="yes"
      accessibilityViewIsModal={true}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : null}
        style={tw`flex-1`}
        keyboardVerticalOffset={Platform.OS === "ios" ? 50 : 0}
      >
        <View style={tw`flex-1 bg-black/40`}>
          <LinearGradient
            colors={["#FFFFFF", "#F8FAFC"]}
            style={tw`flex-1 mt-20 rounded-t-3xl overflow-hidden border-t border-purple-100`}
            accessible={true}
            accessibilityLabel="Share story modal"
          >
            {/* Header */}
            <LinearGradient
              colors={["#4A148C", "#6A1B9A"]}
              style={tw`px-5 pt-7 pb-5 shadow-lg`}
            >
              <View style={tw`flex-row items-center justify-between mb-4`}>
                <View style={tw`flex-1`}>
                  <View style={tw`flex-row items-center flex-wrap`}>
                    <Text style={[tw`text-white text-2xl mr-2`, { fontFamily: 'Poppins-Bold' }]}>
                      Share Your Story
                    </Text>
                  </View>
                  <Text style={[tw`text-white/90 text-sm mt-1`, { fontFamily: 'Poppins-Regular' }]}>
                    Inspire others with your journey
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleClose}
                  style={tw`w-10 h-10 rounded-full bg-white/10 items-center justify-center border border-white/20`}
                  activeOpacity={0.7}
                  accessibilityLabel="Close modal"
                  accessibilityRole="button"
                >
                  <X size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={tw`pb-36 px-5 pt-6`}
              showsHorizontalScrollIndicator={false}
              bounces={false}
            >
              {/* Story Title - REQUIRED */}
              <InputField
                icon={Type}
                placeholder="Story Title *"
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (errors.title) {
                    setErrors(prev => ({ ...prev, title: undefined }));
                  }
                }}
                error={errors.title}
                maxLength={100}
                returnKeyType="next"
                onSubmitEditing={() => contentRef.current?.focus()}
                autoCapitalize="words"
                autoCorrect={true}
                accessibilityLabel="Story title input"
                inputRef={titleRef}
              />

              {/* Story Content - REQUIRED */}
              <InputField
                icon={FileText}
                placeholder="Your Story *"
                value={content}
                onChangeText={(text) => {
                  setContent(text);
                  if (errors.content) {
                    setErrors(prev => ({ ...prev, content: undefined }));
                  }
                }}
                error={errors.content}
                multiline={true}
                maxLength={MAX_CHARS}
                inputRef={contentRef}
                returnKeyType="next"
                onSubmitEditing={() => imageRef.current?.focus()}
                textAlignVertical="top"
                autoCorrect={true}
                spellCheck={true}
                accessibilityLabel="Story content input"
                accessibilityHint="Write your success story here"
              />

              {/* Character & Word Counters */}
              <View style={tw`flex-row justify-between items-center mb-4`}>
                <View style={tw`flex-row items-center`}>
                  <PenTool size={14} color="#6B7280" />
                  <Text style={[tw`text-gray-500 text-xs ml-1.5`, { fontFamily: 'Poppins-Regular' }]}>
                    {wordCount} {wordCount === 1 ? 'word' : 'words'}
                  </Text>
                  {isOverLimit && (
                    <View style={tw`ml-2 flex-row items-center`}>
                      <AlertCircle size={12} color="#EF4444" />
                      <Text style={[tw`text-red-600 text-xs ml-1`, { fontFamily: 'Poppins-Medium' }]}>
                        Max 1000 words
                      </Text>
                    </View>
                  )}
                </View>
                <View style={tw`flex-row items-center`}>
                  <Clock size={14} color="#6B7280" />
                  <Text
                    style={[
                      tw`text-xs ml-1.5`,
                      {
                        fontFamily: 'Poppins-Medium',
                        color: counterColor
                      }
                    ]}
                  >
                    {remainingChars} chars left
                  </Text>
                </View>
              </View>

              {/* Image URL - OPTIONAL */}
              <InputField
                icon={Link}
                placeholder="Image URL (Optional)"
                value={image}
                onChangeText={(text) => {
                  setImage(text);
                  if (errors.image) {
                    setErrors(prev => ({ ...prev, image: undefined }));
                  }
                }}
                error={errors.image}
                maxLength={500}
                inputRef={imageRef}
                returnKeyType="done"
                onSubmitEditing={submit}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                accessibilityLabel="Optional image URL input"
                accessibilityHint="Paste a link to an image for your story"
              />

              {/* Help Text */}
              <View style={tw`mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100`}>
                <View style={tw`flex-row items-center mb-2`}>
                  <AlertCircle size={16} color="#6A1B9A" />
                  <Text style={[tw`text-purple-800 text-sm ml-2`, { fontFamily: 'Poppins-SemiBold' }]}>
                    Tips for a great story:
                  </Text>
                </View>
                <View style={tw`ml-7`}>
                  <Text style={[tw`text-purple-700 text-xs mb-1`, { fontFamily: 'Poppins-Regular' }]}>
                    • Be authentic and specific about your experience
                  </Text>
                  <Text style={[tw`text-purple-700 text-xs mb-1`, { fontFamily: 'Poppins-Regular' }]}>
                    • Share challenges and how you overcame them
                  </Text>
                  <Text style={[tw`text-purple-700 text-xs mb-1`, { fontFamily: 'Poppins-Regular' }]}>
                    • Focus on your mentorship journey and growth
                  </Text>
                  <Text style={[tw`text-purple-700 text-xs`, { fontFamily: 'Poppins-Regular' }]}>
                    • Keep it between 300-500 words for best engagement
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Fixed Action Footer */}
            <View style={tw`absolute bottom-0 left-0 right-0 bg-white border-t border-purple-100 px-5 py-5 shadow-lg`}>
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <TouchableOpacity
                  onPress={handleClose}
                  style={tw`flex-1 mr-3 items-center justify-center py-3.5 border border-gray-300 rounded-xl bg-white`}
                  activeOpacity={0.7}
                  accessibilityLabel="Cancel and close modal"
                  accessibilityRole="button"
                >
                  <Text style={[tw`text-gray-700 text-sm`, { fontFamily: 'Poppins-Medium' }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={submit}
                  disabled={!canSubmit || isOverLimit}
                  style={[
                    tw`flex-1 ml-3 items-center justify-center py-3.5 rounded-xl flex-row`,
                    canSubmit && !isOverLimit && tw`shadow-sm`,

                    canSubmit && !isOverLimit ? tw`bg-purple-700` : tw`bg-gray-300`
                  ]}
                  activeOpacity={0.8}
                  accessibilityLabel="Share your story"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canSubmit || isOverLimit }}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <CheckCircle size={18} color="#FFFFFF" />
                      <Text style={[tw`text-white text-sm ml-2`, { fontFamily: 'Poppins-SemiBold' }]}>
                        Share Story
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Form Status Indicator */}
              <View style={tw`items-center`}>
                {!canSubmit && !loading && (
                  <View style={tw`flex-row items-center`}>
                    <View style={tw`w-2 h-2 rounded-full bg-gray-400 mr-1.5`} />
                    <Text style={[tw`text-gray-600 text-xs`, { fontFamily: 'Poppins-Regular' }]}>
                      Add title and story to continue
                    </Text>
                  </View>
                )}

                {canSubmit && !loading && !isOverLimit && (
                  <View style={tw`flex-row items-center`}>
                    <View style={tw`w-2 h-2 rounded-full bg-green-500 mr-1.5`} />
                    <Text style={[tw`text-green-700 text-xs`, { fontFamily: 'Poppins-Medium' }]}>
                      Ready to share your inspiring story
                    </Text>
                  </View>
                )}

                {isOverLimit && (
                  <View style={tw`flex-row items-center`}>
                    <View style={tw`w-2 h-2 rounded-full bg-red-500 mr-1.5`} />
                    <Text style={[tw`text-red-600 text-xs`, { fontFamily: 'Poppins-Medium' }]}>
                      Story exceeds 1000 word limit ({wordCount} words)
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}