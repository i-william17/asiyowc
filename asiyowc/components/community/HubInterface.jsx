import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  Pressable,
  FlatList,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { decode as atob } from "base-64";

import tw from "../../utils/tw";
import {
  fetchHubDetail,
  fetchHubUpdates,
  createHubUpdate,
  joinHub,
  leaveHub,
  addHubUpdate,
  removeHubUpdate
} from "../../store/slices/communitySlice";
import { connectSocket } from "../../services/socket";
import LoadingBlock from "./LoadingBlock";
import EmptyState from "./EmptyState";

/* =====================================================
   JWT HELPERS (same as ChatInterface)
===================================================== */
const getUserIdFromToken = (token) => {
  try {
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return String(payload.id || payload._id || payload.userId || "");
  } catch {
    return null;
  }
};

export default function HubInterface({ hubId }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const listRef = useRef(null);
  const [message, setMessage] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [caption, setCaption] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const {
    selectedHub,
    hubUpdates,
    loadingDetail,
    hubUpdatesLoading,
  } = useSelector((s) => s.community);

  // Get token and extract user ID (matches ChatInterface pattern)
  const { token } = useSelector((s) => s.auth);
  const myId = getUserIdFromToken(token);

  // Member and moderator checks using token-based ID
  const isMember = selectedHub?.members?.some(
    (m) => String(m) === String(myId)
  );

  const isModerator = selectedHub?.moderators?.some((m) => {
    const id = m?._id || m;
    return String(id) === String(myId);
  });

  /* ===========================
     FETCH HUB (READ-ONLY)
  =========================== */
  useEffect(() => {
    if (!hubId) return;

    dispatch(fetchHubDetail(hubId));
    dispatch(fetchHubUpdates(hubId));
  }, [hubId, dispatch]);

  /* =====================================================
     HUB SOCKET (REALTIME — SAME PATTERN AS CHAT)
  ===================================================== */
  useEffect(() => {
    if (!token || !hubId) return;

    const socket = connectSocket(token);

    // join hub room
    socket.emit("hub:join", { hubId });

    // new update - with auto-scroll to top
    socket.on("hub:update:new", (update) => {
      dispatch(addHubUpdate(update));
      // Auto-scroll to newest post with layout guarantee
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
    });

    // delete update
    socket.on("hub:update:delete", ({ updateId }) => {
      dispatch(removeHubUpdate(updateId));
    });

    return () => {
      socket.emit("hub:leave", { hubId });
      // Only remove listeners, don't disconnect (singleton socket)
      socket.off("hub:update:new");
      socket.off("hub:update:delete");
    };
  }, [hubId, token, dispatch]);

  const handleSendMessage = async () => {
    if (!message.trim() || isSending) return;

    // Optimistic update
    const optimisticId = Date.now().toString();
    const optimisticUpdate = {
      _id: optimisticId,
      content: message,
      authorName: "You",
      createdAt: new Date().toISOString(),
      pending: true
    };

    dispatch(addHubUpdate(optimisticUpdate));
    setMessage("");

    try {
      setIsSending(true);

      const formData = new FormData();
      formData.append("content", message);

      await dispatch(
        createHubUpdate({ hubId, formData })
      ).unwrap();

      // Server will broadcast real update via socket
    } catch {
      // Remove optimistic update on error
      dispatch(removeHubUpdate(optimisticId));
      Alert.alert("Error", "Failed to send update");
    } finally {
      setIsSending(false);
    }
  };

  const handleMediaSelect = async (type) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert("Permission needed", `Please grant permission to access ${type}s`);
        return;
      }

      const result = type === 'image'
        ? await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
          base64: false,
        })
        : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: true,
          quality: 0.8,
        });

      if (!result.canceled) {
        setSelectedMedia(result.assets[0]);
        setMediaType(type);
        setShowMediaOptions(false);
        setShowPreview(true);
      }
    } catch (error) {
      Alert.alert("Error", `Failed to pick ${type}`);
    }
  };

  const handleMediaPost = async () => {
    if (!selectedMedia || isSending) return;

    // Optimistic update
    const optimisticId = Date.now().toString();
    const optimisticUpdate = {
      _id: optimisticId,
      content: caption || "📸 Shared media",
      authorName: "You",
      createdAt: new Date().toISOString(),
      media: { type: mediaType === 'video' ? 'video/mp4' : 'image/jpeg' },
      pending: true
    };

    dispatch(addHubUpdate(optimisticUpdate));

    try {
      setIsSending(true);

      const formData = new FormData();

      if (caption.trim()) {
        formData.append("content", caption);
      }

      const filename = selectedMedia.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';

      const type =
        mediaType === 'video'
          ? `video/${ext}`
          : `image/${ext}`;

      formData.append("media", {
        uri: selectedMedia.uri,
        name: filename,
        type,
      });

      await dispatch(
        createHubUpdate({ hubId, formData })
      ).unwrap();

      // ✅ Clear state AFTER successful upload
      setSelectedMedia(null);
      setMediaType(null);
      setCaption("");
      setShowPreview(false);

      // Server will broadcast real update via socket
    } catch {
      // Remove optimistic update on error
      dispatch(removeHubUpdate(optimisticId));
      Alert.alert("Error", "Failed to post media");
    } finally {
      setIsSending(false);
    }
  };

  const handleJoinHub = async () => {
    try {
      await dispatch(joinHub(hubId)).unwrap();
      setShowMenu(false);
      Alert.alert("Success", "You have joined the hub!");
    } catch (error) {
      Alert.alert("Error", "Failed to join hub");
    }
  };

  const handleLeaveHub = async () => {
    Alert.alert(
      "Leave Hub",
      "Are you sure you want to leave this hub?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await dispatch(leaveHub(hubId)).unwrap();
              setShowMenu(false);
              Alert.alert("Success", "You have left the hub");
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to leave hub");
            }
          }
        }
      ]
    );
  };

  const renderUpdate = ({ item: update }) => (
    <View style={tw`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4`}>
      <View style={tw`flex-row items-center mb-3`}>
        <View style={tw`w-8 h-8 rounded-full bg-purple-100 items-center justify-center mr-2`}>
          <Ionicons name="megaphone" size={16} color="#6A1B9A" />
        </View>
        <View style={tw`flex-1`}>
          <Text style={tw`font-["Poppins-SemiBold"] text-gray-800`}>
            {update.authorName || "Moderator"}
            {update.pending && (
              <Text style={tw`text-xs text-gray-400 ml-2`}> (sending...)</Text>
            )}
          </Text>
          <Text style={tw`font-["Poppins-Regular"] text-xs text-gray-500`}>
            {new Date(update.createdAt || update.timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>

      {/* Content */}
      {update.content && (
        <Text style={tw`font-["Poppins-Regular"] text-gray-700 mb-3`}>
          {update.content}
        </Text>
      )}

      {/* Media if exists */}
      {update.media && (
        <View style={tw`rounded-xl overflow-hidden bg-gray-100`}>
          {update.media.type?.startsWith('image/') ? (
            <Image
              source={{ uri: update.media.url }}
              style={tw`w-full h-64`}
              resizeMode="cover"
            />
          ) : (
            <View style={tw`w-full h-64 items-center justify-center bg-gray-900`}>
              <Ionicons name="play-circle" size={64} color="#fff" />
              <Text style={tw`text-white mt-2 font-["Poppins-Regular"]`}>
                Video Attachment
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  if (loadingDetail || !selectedHub) {
    return <LoadingBlock />;
  }

  const {
    name,
    description,
    avatar,
    membersCount = 0,
    type,
    region,
  } = selectedHub;

  console.log("===== HUB DEBUG =====");
  console.log("token:", token);
  console.log("myId:", myId);
  console.log("selectedHub:", selectedHub?._id);
  console.log("moderators:", selectedHub?.moderators);
  console.log("members:", selectedHub?.members);
  console.log("isModerator:", isModerator);
  console.log("====================");


  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header - Fixed outside FlatList */}
      <View style={tw`bg-[#6A1B9A] px-6 pt-14 pb-8 rounded-b-3xl`}>
        {/* Back and Menu */}
        <View style={tw`flex-row justify-between items-center mb-4`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`p-2`}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            style={tw`p-2`}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Hub Meta */}
        <View style={tw`flex-row items-center`}>
          <View
            style={tw`w-16 h-16 rounded-2xl overflow-hidden bg-purple-200 mr-4`}
          >
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                style={tw`w-full h-full`}
              />
            ) : (
              <View
                style={tw`flex-1 items-center justify-center`}
              >
                <Ionicons name="earth" size={28} color="#6A1B9A" />
              </View>
            )}
          </View>

          <View style={tw`flex-1`}>
            <Text
              style={{
                fontFamily: "Poppins-Bold",
                fontSize: 20,
                color: "#fff",
              }}
            >
              {name}
            </Text>

            <Text
              style={{
                fontFamily: "Poppins-Regular",
                fontSize: 13,
                color: "#E9D5FF",
                marginTop: 2,
              }}
            >
              {membersCount} members · {type?.toUpperCase()}
              {region ? ` · ${region}` : ""}
            </Text>
          </View>
        </View>

        {/* Description */}
        {description ? (
          <Text
            style={{
              fontFamily: "Poppins-Regular",
              fontSize: 14,
              color: "#F3E8FF",
              marginTop: 14,
              lineHeight: 20,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>

      {/* Feed - Using FlatList for better performance */}
      <FlatList
        ref={listRef}
        data={hubUpdates}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`px-6 pt-6 pb-24`}
        renderItem={renderUpdate}
        ListEmptyComponent={
          hubUpdatesLoading ? (
            <LoadingBlock />
          ) : (
            <EmptyState
              title="No updates yet"
              subtitle="Announcements and hub updates will appear here."
            />
          )
        }
      />

      {/* WhatsApp-style Input - Only visible to moderators */}
      {isModerator ? (
        <View style={tw`px-3 pb-6 pt-3 border-t border-gray-200 bg-white`}>
          <View style={tw`flex-row items-end`}>
            {/* Media Attachment Button */}
            <TouchableOpacity
              onPress={() => setShowMediaOptions(true)}
              style={tw`p-2 mb-1`}
            >
              <Ionicons name="add-circle-outline" size={32} color="#6A1B9A" />
            </TouchableOpacity>

            {/* Text Input */}
            <View style={tw`flex-1 mx-2`}>
              <View style={tw`bg-gray-100 rounded-3xl px-4 py-2 min-h-[42px] max-h-32`}>
                <TextInput
                  style={tw`font-["Poppins-Regular"] text-base py-1`}
                  placeholder="Type a message..."
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  maxLength={500}
                />
              </View>
            </View>

            {/* Send Button */}
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!message.trim() || isSending}
              style={[
                tw`p-2 mb-1 rounded-full`,
                !message.trim() || isSending
                  ? tw`opacity-50`
                  : tw`bg-[#6A1B9A]`
              ]}
            >
              <Ionicons
                name="send"
                size={24}
                color={!message.trim() || isSending ? "#9CA3AF" : "#fff"}
              />
            </TouchableOpacity>
          </View>

          {/* Character count */}
          {message.length > 0 && (
            <Text style={tw`text-xs text-gray-400 mt-1 text-right font-["Poppins-Regular"] pr-2`}>
              {message.length}/500
            </Text>
          )}
        </View>
      ) : (
        // Non-moderator view
        <View style={tw`px-4 pb-6 pt-4 border-t border-gray-200 bg-gray-50`}>
          <Text style={tw`text-center text-gray-600 font-["Poppins-Regular"]`}>
            Only moderators can send updates to this hub
          </Text>
        </View>
      )}

      {/* Media Options Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showMediaOptions}
        onRequestClose={() => setShowMediaOptions(false)}
      >
        <Pressable
          style={tw`flex-1 bg-black/50`}
          onPress={() => setShowMediaOptions(false)}
        >
          <View style={tw`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6`}>
            <View style={tw`w-12 h-1 bg-gray-300 rounded-full self-center mb-6`} />

            <Text style={tw`font-["Poppins-SemiBold"] text-lg text-gray-800 mb-4`}>
              Add to hub
            </Text>

            <TouchableOpacity
              onPress={() => handleMediaSelect('image')}
              style={tw`flex-row items-center py-4 border-b border-gray-100`}
            >
              <View style={tw`w-10 h-10 bg-purple-100 rounded-full items-center justify-center mr-4`}>
                <Ionicons name="image" size={24} color="#6A1B9A" />
              </View>
              <View>
                <Text style={tw`font-["Poppins-SemiBold"] text-gray-800`}>
                  Photo
                </Text>
                <Text style={tw`font-["Poppins-Regular"] text-xs text-gray-500`}>
                  Share an image with the hub
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleMediaSelect('video')}
              style={tw`flex-row items-center py-4`}
            >
              <View style={tw`w-10 h-10 bg-purple-100 rounded-full items-center justify-center mr-4`}>
                <Ionicons name="videocam" size={24} color="#6A1B9A" />
              </View>
              <View>
                <Text style={tw`font-["Poppins-SemiBold"] text-gray-800`}>
                  Video
                </Text>
                <Text style={tw`font-["Poppins-Regular"] text-xs text-gray-500`}>
                  Share a video with the hub
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowMediaOptions(false)}
              style={tw`mt-6 py-3`}
            >
              <Text style={tw`text-center text-gray-500 font-["Poppins-Regular"]`}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Media Preview Modal */}
      <Modal
        animationType="slide"
        visible={showPreview}
        onRequestClose={() => {
          setShowPreview(false);
          setSelectedMedia(null);
          setMediaType(null);
          setCaption("");
        }}
      >
        <SafeAreaView style={tw`flex-1 bg-black`}>
          {/* Header */}
          <View style={tw`flex-row justify-between items-center p-4 bg-black`}>
            <TouchableOpacity
              onPress={() => {
                setShowPreview(false);
                setSelectedMedia(null);
                setMediaType(null);
                setCaption("");
              }}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={tw`text-white font-["Poppins-SemiBold"] text-lg`}>
              Preview
            </Text>
            <TouchableOpacity
              onPress={handleMediaPost}
              disabled={isSending}
            >
              <Text style={[
                tw`text-[#6A1B9A] font-["Poppins-SemiBold"] text-base`,
                isSending && tw`opacity-50`
              ]}>
                {isSending ? "Posting..." : "Post"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Media Preview */}
          <FlatList
            data={[{ key: 'preview' }]}
            renderItem={() => (
              <>
                {selectedMedia && (
                  <View>
                    {mediaType === 'image' ? (
                      <Image
                        source={{ uri: selectedMedia.uri }}
                        style={tw`w-full h-96`}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={tw`w-full h-96 items-center justify-center`}>
                        <Ionicons name="play-circle" size={80} color="#fff" />
                        <Text style={tw`text-white mt-4 font-["Poppins-Regular"]`}>
                          Video Preview
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Caption Input */}
                <View style={tw`p-4`}>
                  <TextInput
                    style={tw`bg-gray-900 text-white rounded-xl px-4 py-3 font-["Poppins-Regular"]`}
                    placeholder="Add a caption..."
                    placeholderTextColor="#9CA3AF"
                    value={caption}
                    onChangeText={setCaption}
                    multiline
                    maxLength={300}
                  />
                  <Text style={tw`text-gray-500 text-xs mt-2 text-right font-["Poppins-Regular"]`}>
                    {caption.length}/300
                  </Text>
                </View>
              </>
            )}
            keyExtractor={(item) => item.key}
          />
        </SafeAreaView>
      </Modal>

      {/* Side Menu Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showMenu}
        onRequestClose={() => setShowMenu(false)}
      >
        <View style={tw`flex-1`}>
          {/* Overlay */}
          <TouchableOpacity
            style={tw`flex-1 bg-black/50`}
            onPress={() => setShowMenu(false)}
            activeOpacity={1}
          />

          {/* Menu Panel */}
          <View style={tw`absolute top-0 right-0 bottom-0 w-4/5 bg-white shadow-xl`}>
            <View style={tw`p-6 pt-14`}>
              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setShowMenu(false)}
                style={tw`absolute top-6 right-6`}
              >
                <Ionicons name="close" size={28} color="#6A1B9A" />
              </TouchableOpacity>

              {/* Hub Info in Menu */}
              <View style={tw`flex-row items-center mb-8`}>
                <View style={tw`w-12 h-12 rounded-xl overflow-hidden bg-purple-100 mr-3`}>
                  {avatar ? (
                    <Image
                      source={{ uri: avatar }}
                      style={tw`w-full h-full`}
                    />
                  ) : (
                    <View style={tw`flex-1 items-center justify-center`}>
                      <Ionicons name="earth" size={22} color="#6A1B9A" />
                    </View>
                  )}
                </View>
                <View>
                  <Text style={tw`font-["Poppins-Bold"] text-lg text-gray-800`}>
                    {name}
                  </Text>
                  <Text style={tw`font-["Poppins-Regular"] text-sm text-gray-600`}>
                    {type?.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Menu Items */}
              <View style={tw`border-t border-gray-200 pt-4`}>
                {/* Hub Description */}
                {description && (
                  <View style={tw`mb-6`}>
                    <Text style={tw`font-["Poppins-SemiBold"] text-gray-700 mb-2`}>
                      About
                    </Text>
                    <Text style={tw`font-["Poppins-Regular"] text-gray-600`}>
                      {description}
                    </Text>
                  </View>
                )}

                {/* Hub Stats */}
                <View style={tw`flex-row mb-6`}>
                  <View style={tw`flex-1`}>
                    <Text style={tw`font-["Poppins-Bold"] text-xl text-[#6A1B9A]`}>
                      {membersCount}
                    </Text>
                    <Text style={tw`font-["Poppins-Regular"] text-gray-600`}>
                      Members
                    </Text>
                  </View>
                  {region && (
                    <View style={tw`flex-1`}>
                      <Text style={tw`font-["Poppins-Bold"] text-xl text-[#6A1B9A]`}>
                        {region}
                      </Text>
                      <Text style={tw`font-["Poppins-Regular"] text-gray-600`}>
                        Region
                      </Text>
                    </View>
                  )}
                </View>

                {/* Join/Leave Button */}
                <TouchableOpacity
                  onPress={isMember ? handleLeaveHub : handleJoinHub}
                  style={tw`mb-4 py-3 rounded-xl ${isMember ? "bg-red-50" : "bg-[#6A1B9A]"
                    }`}
                >
                  <Text style={tw`text-center font-["Poppins-SemiBold"] ${isMember ? "text-red-600" : "text-white"
                    }`}>
                    {isMember ? "Leave Hub" : "Join Hub"}
                  </Text>
                </TouchableOpacity>

                {/* Settings (for moderators) */}
                {isModerator && (
                  <TouchableOpacity
                    style={tw`py-3 rounded-xl border border-[#6A1B9A] mb-4`}
                    onPress={() => {
                      setShowMenu(false);
                      // Navigate to hub settings
                      // router.push(`/hub/${hubId}/settings`);
                    }}
                  >
                    <Text style={tw`text-center font-["Poppins-SemiBold"] text-[#6A1B9A]`}>
                      Hub Settings
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Report Hub */}
                <TouchableOpacity
                  style={tw`py-3`}
                  onPress={() => {
                    setShowMenu(false);
                    Alert.alert("Report Hub", "This feature is coming soon!");
                  }}
                >
                  <Text style={tw`text-center font-["Poppins-Regular"] text-gray-500`}>
                    Report Hub
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}