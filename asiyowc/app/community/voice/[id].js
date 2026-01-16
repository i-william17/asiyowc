import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Pressable,
  Platform,
  Animated,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { server } from "../../../server";
import DateTimePicker from "@react-native-community/datetimepicker";
import { decode as atob } from "base-64";

import tw from "../../../utils/tw";
import LoadingBlock from "../../../components/community/LoadingBlock";
import EmptyState from "../../../components/community/EmptyState";
import { fetchVoiceDetail } from "../../../store/slices/communitySlice";

/* =====================================================
   VOICE DETAIL SCREEN
===================================================== */

export default function VoiceDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();

  const { selectedVoice, loadingDetail, error } = useSelector(
    (s) => s.community
  );
  const { token } = useSelector((s) => s.auth);

  const [joining, setJoining] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    if (id) dispatch(fetchVoiceDetail(id));
  }, [id]);

  useEffect(() => {
    if (token) {
      const uid = getUserIdFromJWT(token);
      setCurrentUserId(uid);
    }
  }, [token]);

  const slideAnim = useState(new Animated.Value(0))[0];

  /* ================= LOAD VOICE & USER INFO ================= */
  function getUserIdFromJWT(token) {
    try {
      if (!token) return null;

      const payload = token.split(".")[1];
      const decoded = JSON.parse(atob(payload));

      return decoded.userId || decoded.id || decoded._id || decoded.sub || null;
    } catch (err) {
      console.warn("Invalid JWT token");
      return null;
    }
  }

  const v = selectedVoice;
  const instance = v?.currentInstance || v?.instances?.[0];
  const isLive = instance?.status === "live";

  /* ================= NORMALIZED HOST DATA ================= */
  const host = useMemo(() => {
    if (!v?.host) return null;

    return {
      id: v.host._id,
      name: v.host.profile?.fullName || "Host",
      avatar: v.host.profile?.avatar?.url || null,
    };
  }, [v]);

  /* ================= DECODE USER FROM TOKEN ================= */
  const isHost = useMemo(() => {
    if (!v?.host || !currentUserId) return false;

    // Compare host ID from voice room with current user ID from token
    // Handle both string and object ID formats
    const hostId = typeof v.host === 'object' ? v.host._id || v.host.$oid : v.host;
    return String(hostId) === String(currentUserId);
  }, [v, currentUserId]);

  const isSpeaker = useMemo(() => {
    if (!instance || !currentUserId) return false;
    return instance.speakers?.some(
      (speaker) => {
        const speakerId = typeof speaker === 'object' ? speaker._id || speaker.$oid : speaker;
        return String(speakerId) === String(currentUserId);
      }
    );
  }, [instance, currentUserId]);

  const isListener = useMemo(() => {
    if (!instance || !currentUserId) return false;
    return instance.participants?.some(
      (participant) => {
        const participantId = typeof participant === 'object' ? participant._id || participant.$oid : participant;
        return String(participantId) === String(currentUserId);
      }
    );
  }, [instance, currentUserId]);

  const hasJoined = isSpeaker || isListener || isHost;

  /* ================= DATE FORMATTING ================= */
  const formatDateDisplay = (startsAt, endsAt) => {
    if (!startsAt || !endsAt) return "Date not set";

    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time for date comparison
    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    let datePrefix = "";
    if (startDay.getTime() === todayDay.getTime()) {
      datePrefix = "Today, ";
    } else if (startDay.getTime() === yesterdayDay.getTime()) {
      datePrefix = "Yesterday, ";
    } else {
      // Format as "Sunday, 1st January 2026"
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

      const day = startDate.getDate();
      const daySuffix = (day) => {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
          case 1: return "st";
          case 2: return "nd";
          case 3: return "rd";
          default: return "th";
        }
      };

      datePrefix = `${dayNames[startDate.getDay()]}, ${day}${daySuffix(day)} ${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}, `;
    }

    // Format time
    const formatTime = (date) => {
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    };

    // Calculate duration in minutes
    const duration = Math.round((endDate - startDate) / (1000 * 60));

    return `${datePrefix}${formatTime(startDate)} – ${formatTime(endDate)} (${duration} mins)`;
  };

  /* ================= ACTION HANDLERS ================= */
  const instanceId = useMemo(() => {
    if (!instance) return null;

    // ✅ THIS is the only correct ID to use for routing & sockets
    return instance.instanceId;
  }, [instance]);

  // const handleJoin = async () => {
  //   if (!instanceId || joining) return;

  //   try {
  //     setJoining(true);

  //     console.log("Joining voice:", v._id);

  //     // // 🟢 Already joined → just enter
  //     // if (hasJoined) {
  //     //   router.push(`/community/voice-room/${instanceId}`);
  //     //   return;
  //     // }

  //     // 🟡 Join via backend
  //     const res = await fetch(
  //       `${server}/community/voice/instance/${v._id}/join`,
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${token}`,
  //         },
  //       }
  //     );

  //     if (!res.ok) {
  //       throw new Error("Failed to join room");
  //     }

  //     const data = await res.json();

  //     console.log("Join response:", data);

  //     // 🔴 HARD REQUIREMENT
  //     if (!data?.instanceId) {
  //       throw new Error("Backend did not return instanceId");
  //     }

  //     // ✅ ALWAYS navigate with LIVE INSTANCE ID
  //     router.push(`/community/voice-room/${data.instanceId}`);
  //   } catch (err) {
  //     console.error("Join failed:", err);
  //     alert("Unable to join room");
  //   } finally {
  //     setJoining(false);
  //   }
  // };

  const handleJoin = async () => {
    if (!instanceId || joining) return;

    try {
      setJoining(true);

      const res = await fetch(
        `${server}/community/voice/instance/${instanceId}/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message || "Failed to join room");
      }

      const data = await res.json();

      // ✅ ALWAYS enter using instanceId
      router.push(`/community/voice-room/${instanceId}`);

    } catch (err) {
      console.error("Join failed:", err);
      alert(err.message);
    } finally {
      setJoining(false);
    }
  };

  const openSettingsModal = () => {
    setShowSettingsModal(true);
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const openEditModal = () => {
    setShowEditModal(true);
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowSettingsModal(false);
      setShowEditModal(false);
    });
  };

  /* ================= STATES ================= */
  if (loadingDetail) return <LoadingBlock />;

  if (!v) {
    return (
      <EmptyState
        title="Voice room not found"
        subtitle={error || "This room may no longer exist."}
      />
    );
  }

  /* ================= UI ================= */
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ================= LOTTIE HERO ================= */}
        <View style={tw`h-64 bg-indigo-700 justify-end`}>
          <LottieView
            source={require("../../../assets/animations/voiceroom.json")}
            autoPlay
            loop
            style={tw`absolute inset-0`}
          />

          {/* Overlay */}
          <View style={tw`bg-black/40 p-5`}>
            <Text
              style={{
                fontFamily: "Poppins-Bold",
                fontSize: 22,
                color: "white",
              }}
            >
              {v.title}
            </Text>

            <View style={tw`flex-row items-center mt-3`}>
              <View style={tw`w-10 h-10 rounded-full bg-gray-200 mr-3 overflow-hidden`}>
                {host?.avatar ? (
                  <Animated.Image
                    source={{ uri: host.avatar }}
                    style={tw`w-full h-full`}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={20} color="#6B7280" style={tw`m-auto`} />
                )}
              </View>

              <View>
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 14,
                    color: "white",
                  }}
                >
                  {host?.name}
                </Text>

                <Text
                  style={{
                    fontFamily: "Poppins-Regular",
                    fontSize: 12,
                    color: "#E5E7EB",
                  }}
                >
                  Host {isHost ? "(You)" : ""}
                </Text>
              </View>

              {isLive && (
                <View style={tw`ml-auto bg-red-500 px-3 py-1 rounded-full`}>
                  <Text
                    style={{
                      fontFamily: "Poppins-Bold",
                      fontSize: 11,
                      color: "white",
                    }}
                  >
                    LIVE
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ================= CONTENT ================= */}
        <View style={tw`px-5 pt-6 pb-10`}>
          {/* ================= DETAILS ================= */}
          <Card title="Details">
            <Row
              icon="time-outline"
              text={formatDateDisplay(
                instance?.startsAt,
                instance?.endsAt
              )}
              highlight={
                new Date(instance?.startsAt).getDate() === new Date().getDate() &&
                new Date(instance?.startsAt).getMonth() === new Date().getMonth() &&
                new Date(instance?.startsAt).getFullYear() === new Date().getFullYear()
              }
            />
            <Row
              icon="people-outline"
              text={`${instance?.speakers?.length ?? 0} Speakers, ${instance?.participants?.length ?? 0
                } Listeners`}
            />
            {instance?.recording?.enabled && (
              <Row
                icon="recording-outline"
                text="Recording is enabled"
                color="#EF4444"
              />
            )}
            {isHost && (
              <Row
                icon="shield-checkmark-outline"
                text="You are the host of this room"
                color="#10B981"
              />
            )}
          </Card>

          {/* ================= PEOPLE IN THIS ROOM ================= */}
          <Card title="People in this Room">
            {/* SPEAKERS */}
            <Text style={tw`font-poppins-semibold text-gray-800 mb-3`}>
              Speakers
            </Text>

            {(instance?.speakers || []).map((u) => {
              // Extract user ID based on your backend structure
              const userId = typeof u === 'object' ? u._id || u.$oid : u;
              const userProfile = typeof u === 'object' ? u.profile || {} : {};

              return (
                <View key={userId} style={tw`flex-row items-center mb-3`}>
                  <View style={tw`w-9 h-9 rounded-full bg-gray-200 mr-3 overflow-hidden`}>
                    {userProfile?.avatar?.url ? (
                      <Animated.Image
                        source={{ uri: userProfile.avatar.url }}
                        style={tw`w-full h-full`}
                      />
                    ) : (
                      <Ionicons name="mic" size={16} color="#6B7280" style={tw`m-auto`} />
                    )}
                  </View>

                  <Text style={tw`font-poppins text-gray-800`}>
                    {userProfile?.fullName || "Speaker"}
                  </Text>

                  {String(userId) === String(currentUserId) && (
                    <Text style={tw`ml-2 text-blue-600 font-poppins-bold`}>(You)</Text>
                  )}
                </View>
              );
            })}

            {/* LISTENERS */}
            <Text style={tw`font-poppins-semibold text-gray-800 mt-5 mb-3`}>
              Listeners
            </Text>

            {(instance?.participants || []).map((u) => {
              // Extract user ID based on your backend structure
              const userId = typeof u === 'object' ? u._id || u.$oid : u;
              const userProfile = typeof u === 'object' ? u.profile || {} : {};

              return (
                <View key={userId} style={tw`flex-row items-center mb-3`}>
                  <View style={tw`w-8 h-8 rounded-full bg-gray-200 mr-3 overflow-hidden`}>
                    {userProfile?.avatar?.url ? (
                      <Animated.Image
                        source={{ uri: userProfile.avatar.url }}
                        style={tw`w-full h-full`}
                      />
                    ) : (
                      <Ionicons name="headset" size={14} color="#6B7280" style={tw`m-auto`} />
                    )}
                  </View>

                  <Text style={tw`font-poppins text-gray-700`}>
                    {userProfile?.fullName || "Listener"}
                  </Text>

                  {String(userId) === String(currentUserId) && (
                    <Text style={tw`ml-2 text-blue-600 font-poppins-bold text-sm`}>(You)</Text>
                  )}
                </View>
              );
            })}
          </Card>

          {/* ================= RULES ================= */}
          <Card title="Room Rules">
            <Rule icon="chatbubble-outline" text="Ephemeral chat" />
            <Rule icon="close-circle-outline" text="No media sharing" />
            <Rule icon="hand-left-outline" text="Be respectful" />
          </Card>

          {/* ================= MODERATION ================= */}
          <Card title="Moderation Settings">
            <Setting
              label="Chat"
              value={instance?.chatEnabled ? "Enabled" : "Disabled"}
            />
            <Setting
              label="Request to Speak"
              value="Required"
            />
            {instance?.kickedUsers && instance.kickedUsers.length > 0 && (
              <Setting
                label="Kicked Users"
                value={`${instance.kickedUsers.length} user(s)`}
              />
            )}
          </Card>

          {/* ================= CTA ================= */}
          <TouchableOpacity
            disabled={joining}
            onPress={handleJoin}
            activeOpacity={0.9}
            style={tw`bg-blue-700 py-4 rounded-2xl items-center mt-4`}
          >
            <Text
              style={{
                fontFamily: "Poppins-Bold",
                fontSize: 16,
                color: "white",
              }}
            >
              {hasJoined ? "Enter Room" : "Join Room"}
            </Text>
          </TouchableOpacity>

          {/* ================= HOST CONTROLS ================= */}
          {isHost && (
            <>
              <TouchableOpacity
                onPress={openSettingsModal}
                style={tw`border border-gray-300 py-3 rounded-2xl mt-3 items-center`}
              >
                <View style={tw`flex-row items-center`}>
                  <Ionicons name="settings-outline" size={18} color="#374151" style={tw`mr-2`} />
                  <Text
                    style={{
                      fontFamily: "Poppins-SemiBold",
                      fontSize: 14,
                    }}
                  >
                    Host Settings
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={openEditModal}
                style={tw`border border-gray-300 py-3 rounded-2xl mt-3 items-center`}
              >
                <View style={tw`flex-row items-center`}>
                  <Ionicons name="create-outline" size={18} color="#374151" style={tw`mr-2`} />
                  <Text
                    style={{
                      fontFamily: "Poppins-SemiBold",
                      fontSize: 14,
                    }}
                  >
                    Edit Room
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* ================= SETTINGS MODAL ================= */}
      <SettingsModal
        visible={showSettingsModal}
        onClose={closeModal}
        slideAnim={slideAnim}
        instance={instance}
        voiceId={v?._id}
        isHost={isHost}
        hostName={host?.name}
      />

      {/* ================= EDIT ROOM MODAL ================= */}
      <EditRoomModal
        visible={showEditModal}
        onClose={closeModal}
        slideAnim={slideAnim}
        voice={v}
        hostName={host?.name}
        isHost={isHost}
      />
    </SafeAreaView>
  );
}

/* =====================================================
   SETTINGS MODAL COMPONENT
===================================================== */

function SettingsModal({ visible, onClose, slideAnim, instance, voiceId, isHost, hostName }) {
  const [recordingEnabled, setRecordingEnabled] = useState(
    instance?.recording?.enabled || false
  );
  const [chatEnabled, setChatEnabled] = useState(
    instance?.chatEnabled || true
  );
  const [speakerApproval, setSpeakerApproval] = useState(true);
  const [ephemeralChat, setEphemeralChat] = useState(true);

  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [800, 0],
  });

  const handleSaveSettings = async () => {
    try {
      // TODO: Implement API call to save settings
      console.log("Saving settings:", {
        recordingEnabled,
        chatEnabled,
        speakerApproval,
        ephemeralChat,
        voiceId,
      });

      // Show success message
      alert("Settings saved successfully!");
      onClose();
    } catch (error) {
      alert("Failed to save settings. Please try again.");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={tw`flex-1 bg-black/50`} onPress={onClose}>
        <Animated.View
          style={[
            tw`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl`,
            {
              transform: [{ translateY: modalTranslateY }],
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            },
          ]}
        >
          <Pressable style={tw`p-6`}>
            {/* Modal Header */}
            <View style={tw`flex-row items-center mb-6`}>
              <View style={tw`w-12 h-1 bg-gray-300 rounded-full mx-auto`} />
            </View>

            <Text
              style={{
                fontFamily: "Poppins-Bold",
                fontSize: 22,
                marginBottom: 8,
              }}
            >
              Host Settings
            </Text>

            <Text
              style={{
                fontFamily: "Poppins-Regular",
                fontSize: 14,
                color: "#6B7280",
                marginBottom: 24,
              }}
            >
              Configure room settings and moderation
            </Text>

            {/* Host Info */}
            <View style={tw`bg-blue-50 rounded-2xl p-4 mb-6`}>
              <View style={tw`flex-row items-center`}>
                <View style={tw`w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-3`}>
                  <Ionicons name="shield-checkmark" size={24} color="#2563EB" />
                </View>
                <View>
                  <Text style={tw`font-poppins-bold text-blue-900`}>
                    {hostName || "Host"}
                  </Text>
                  <Text style={tw`font-poppins text-blue-700 text-sm`}>
                    Room Host (You)
                  </Text>
                </View>
              </View>
            </View>

            {/* Statistics */}
            <View style={tw`bg-gray-50 rounded-2xl p-4 mb-6`}>
              <Text
                style={{
                  fontFamily: "Poppins-SemiBold",
                  fontSize: 16,
                  marginBottom: 12,
                }}
              >
                Room Statistics
              </Text>

              <View style={tw`flex-row justify-between mb-3`}>
                <View style={tw`flex-row items-center`}>
                  <Ionicons name="person-remove-outline" size={16} color="#DC2626" style={tw`mr-2`} />
                  <Text style={tw`font-poppins text-gray-600`}>
                    Kicked Users
                  </Text>
                </View>
                <Text style={tw`font-poppins-bold text-red-600`}>
                  {instance?.kickedUsers?.length || 0}
                </Text>
              </View>

              <View style={tw`flex-row justify-between mb-3`}>
                <View style={tw`flex-row items-center`}>
                  <Ionicons name="mic-outline" size={16} color="#2563EB" style={tw`mr-2`} />
                  <Text style={tw`font-poppins text-gray-600`}>
                    Current Speakers
                  </Text>
                </View>
                <Text style={tw`font-poppins-bold text-blue-600`}>
                  {instance?.speakers?.length || 0}
                </Text>
              </View>

              <View style={tw`flex-row justify-between mb-3`}>
                <View style={tw`flex-row items-center`}>
                  <Ionicons name="headset-outline" size={16} color="#059669" style={tw`mr-2`} />
                  <Text style={tw`font-poppins text-gray-600`}>
                    Current Listeners
                  </Text>
                </View>
                <Text style={tw`font-poppins-bold text-green-600`}>
                  {instance?.participants?.length || 0}
                </Text>
              </View>

              <View style={tw`flex-row justify-between`}>
                <View style={tw`flex-row items-center`}>
                  <Ionicons name="time-outline" size={16} color="#7C3AED" style={tw`mr-2`} />
                  <Text style={tw`font-poppins text-gray-600`}>
                    Room Duration
                  </Text>
                </View>
                <Text style={tw`font-poppins-bold text-purple-600`}>
                  {instance?.startsAt && instance?.endsAt
                    ? `${Math.round((new Date(instance.endsAt) - new Date(instance.startsAt)) / (1000 * 60))} mins`
                    : "N/A"}
                </Text>
              </View>
            </View>

            {/* Toggle Settings */}
            <View style={tw`mb-6`}>
              <Text style={tw`font-poppins-bold text-gray-800 mb-4 text-lg`}>
                Room Controls
              </Text>

              <View style={tw`flex-row justify-between items-center mb-4`}>
                <View style={tw`flex-1`}>
                  <Text style={tw`font-poppins-bold text-gray-800 mb-1`}>
                    Enable Recording
                  </Text>
                  <Text style={tw`font-poppins text-gray-500 text-sm`}>
                    Record this room session for later playback
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setRecordingEnabled(!recordingEnabled)}
                  style={tw`ml-4`}
                >
                  <View
                    style={[
                      tw`w-12 h-6 rounded-full flex-row items-center px-1`,
                      recordingEnabled
                        ? tw`bg-blue-600 justify-end`
                        : tw`bg-gray-300 justify-start`,
                    ]}
                  >
                    <View
                      style={tw`w-5 h-5 bg-white rounded-full shadow-sm`}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={tw`flex-row justify-between items-center mb-4`}>
                <View style={tw`flex-1`}>
                  <Text style={tw`font-poppins-bold text-gray-800 mb-1`}>
                    Enable Chat
                  </Text>
                  <Text style={tw`font-poppins text-gray-500 text-sm`}>
                    Allow participants to send messages
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setChatEnabled(!chatEnabled)}
                  style={tw`ml-4`}
                >
                  <View
                    style={[
                      tw`w-12 h-6 rounded-full flex-row items-center px-1`,
                      chatEnabled
                        ? tw`bg-blue-600 justify-end`
                        : tw`bg-gray-300 justify-start`,
                    ]}
                  >
                    <View
                      style={tw`w-5 h-5 bg-white rounded-full shadow-sm`}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={tw`flex-row justify-between items-center mb-4`}>
                <View style={tw`flex-1`}>
                  <Text style={tw`font-poppins-bold text-gray-800 mb-1`}>
                    Speaker Approval Required
                  </Text>
                  <Text style={tw`font-poppins text-gray-500 text-sm`}>
                    Approve users before they can speak
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSpeakerApproval(!speakerApproval)}
                  style={tw`ml-4`}
                >
                  <View
                    style={[
                      tw`w-12 h-6 rounded-full flex-row items-center px-1`,
                      speakerApproval
                        ? tw`bg-blue-600 justify-end`
                        : tw`bg-gray-300 justify-start`,
                    ]}
                  >
                    <View
                      style={tw`w-5 h-5 bg-white rounded-full shadow-sm`}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={tw`flex-row justify-between items-center mb-4`}>
                <View style={tw`flex-1`}>
                  <Text style={tw`font-poppins-bold text-gray-800 mb-1`}>
                    Ephemeral Chat
                  </Text>
                  <Text style={tw`font-poppins text-gray-500 text-sm`}>
                    Chat messages disappear after room ends
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setEphemeralChat(!ephemeralChat)}
                  style={tw`ml-4`}
                >
                  <View
                    style={[
                      tw`w-12 h-6 rounded-full flex-row items-center px-1`,
                      ephemeralChat
                        ? tw`bg-blue-600 justify-end`
                        : tw`bg-gray-300 justify-start`,
                    ]}
                  >
                    <View
                      style={tw`w-5 h-5 bg-white rounded-full shadow-sm`}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Create New Instance */}
            <TouchableOpacity
              style={tw`border-2 border-blue-600 py-3 rounded-2xl items-center mb-4`}
            >
              <View style={tw`flex-row items-center`}>
                <Ionicons name="add-circle-outline" size={20} color="#2563EB" style={tw`mr-2`} />
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 14,
                    color: "#2563EB",
                  }}
                >
                  Create New Instance
                </Text>
              </View>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={tw`flex-row space-x-3`}>
              <TouchableOpacity
                onPress={onClose}
                style={tw`flex-1 border border-gray-300 py-3 rounded-2xl items-center`}
              >
                <Text style={tw`font-poppins-bold text-gray-700`}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveSettings}
                style={tw`flex-1 bg-blue-700 py-3 rounded-2xl items-center`}
              >
                <Text style={tw`font-poppins-bold text-white`}>
                  Save Settings
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

/* =====================================================
   EDIT ROOM MODAL COMPONENT
===================================================== */

function EditRoomModal({ visible, onClose, slideAnim, voice, hostName, isHost }) {
  const [title, setTitle] = useState(voice?.title || "");
  const [description, setDescription] = useState(voice?.description || "");
  const [selectedDate, setSelectedDate] = useState(
    voice?.instances?.[0]?.startsAt
      ? new Date(voice.instances[0].startsAt)
      : new Date()
  );
  const [duration, setDuration] = useState(
    voice?.instances?.[0]?.startsAt && voice?.instances?.[0]?.endsAt
      ? Math.round((new Date(voice.instances[0].endsAt) - new Date(voice.instances[0].startsAt)) / (1000 * 60))
      : 90
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [roomRules, setRoomRules] = useState([
    "Ephemeral chat",
    "No media sharing",
    "Be respectful"
  ]);
  const [newRule, setNewRule] = useState("");

  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [800, 0],
  });

  const onDateChange = (event, date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleAddRule = () => {
    if (newRule.trim()) {
      setRoomRules([...roomRules, newRule.trim()]);
      setNewRule("");
    }
  };

  const handleRemoveRule = (index) => {
    const newRules = [...roomRules];
    newRules.splice(index, 1);
    setRoomRules(newRules);
  };

  const handleSaveChanges = async () => {
    try {
      // TODO: Implement API call to update room
      console.log("Saving room changes:", {
        title,
        description,
        startsAt: selectedDate,
        duration,
        rules: roomRules,
      });

      // Show success message
      alert("Room updated successfully!");
      onClose();
    } catch (error) {
      alert("Failed to update room. Please try again.");
    }
  };

  const handleDeleteRoom = () => {
    // TODO: Implement room deletion
    alert("Room deletion functionality to be implemented");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={tw`flex-1 bg-black/50`} onPress={onClose}>
        <Animated.View
          style={[
            tw`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90%]`,
            {
              transform: [{ translateY: modalTranslateY }],
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false} style={tw`max-h-[90%]`}>
            <Pressable style={tw`p-6`}>
              {/* Modal Header */}
              <View style={tw`flex-row items-center mb-6`}>
                <View style={tw`w-12 h-1 bg-gray-300 rounded-full mx-auto`} />
              </View>

              <Text
                style={{
                  fontFamily: "Poppins-Bold",
                  fontSize: 22,
                  marginBottom: 8,
                }}
              >
                Edit Room
              </Text>

              <Text
                style={{
                  fontFamily: "Poppins-Regular",
                  fontSize: 14,
                  color: "#6B7280",
                  marginBottom: 24,
                }}
              >
                Update room details and schedule
              </Text>

              {/* Host Warning */}
              {!isHost && (
                <View style={tw`bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6`}>
                  <View style={tw`flex-row items-center`}>
                    <Ionicons name="warning-outline" size={20} color="#D97706" style={tw`mr-2`} />
                    <Text style={tw`font-poppins-bold text-yellow-800`}>
                      You are not the host of this room
                    </Text>
                  </View>
                  <Text style={tw`font-poppins text-yellow-700 text-sm mt-2`}>
                    Only the host can edit room settings. Please contact {hostName || "the host"} for changes.
                  </Text>
                </View>
              )}

              {/* Room Title */}
              <View style={tw`mb-6`}>
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 14,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Room Title
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Enter room title"
                  style={tw`border border-gray-300 rounded-2xl px-4 py-3 font-poppins`}
                  placeholderTextColor="#9CA3AF"
                  editable={isHost}
                />
              </View>

              {/* Description */}
              <View style={tw`mb-6`}>
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 14,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe what this room is about"
                  multiline
                  numberOfLines={4}
                  style={tw`border border-gray-300 rounded-2xl px-4 py-3 font-poppins h-32`}
                  placeholderTextColor="#9CA3AF"
                  textAlignVertical="top"
                  editable={isHost}
                />
              </View>

              {/* Schedule */}
              <View style={tw`mb-6`}>
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 14,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Schedule
                </Text>

                {/* Date Picker */}
                <TouchableOpacity
                  onPress={() => isHost && setShowDatePicker(true)}
                  style={[
                    tw`border border-gray-300 rounded-2xl px-4 py-3 mb-3 flex-row justify-between items-center`,
                    !isHost && tw`opacity-50`
                  ]}
                  disabled={!isHost}
                >
                  <Text style={tw`font-poppins text-gray-800`}>
                    {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="datetime"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onDateChange}
                    minimumDate={new Date()}
                  />
                )}

                {/* Duration Picker */}
                <View style={[
                  tw`border border-gray-300 rounded-2xl px-4 py-3 flex-row justify-between items-center`,
                  !isHost && tw`opacity-50`
                ]}>
                  <Text style={tw`font-poppins text-gray-800`}>
                    Duration: {duration} minutes
                  </Text>
                  {isHost && (
                    <View style={tw`flex-row items-center`}>
                      <TouchableOpacity
                        onPress={() => setDuration(Math.max(15, duration - 15))}
                        style={tw`w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-2`}
                      >
                        <Ionicons name="remove" size={16} color="#374151" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setDuration(duration + 15)}
                        style={tw`w-8 h-8 rounded-full bg-gray-100 items-center justify-center`}
                      >
                        <Ionicons name="add" size={16} color="#374151" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Room Rules */}
              <View style={tw`mb-6`}>
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 14,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Room Rules
                </Text>

                {roomRules.map((rule, index) => (
                  <View key={index} style={tw`flex-row items-center justify-between mb-2`}>
                    <View style={tw`flex-row items-center flex-1`}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" style={tw`mr-2`} />
                      <Text style={tw`font-poppins text-gray-700 flex-1`}>{rule}</Text>
                    </View>
                    {isHost && (
                      <TouchableOpacity
                        onPress={() => handleRemoveRule(index)}
                        style={tw`ml-2`}
                      >
                        <Ionicons name="trash-outline" size={18} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {isHost && (
                  <View style={tw`flex-row items-center mt-3`}>
                    <TextInput
                      value={newRule}
                      onChangeText={setNewRule}
                      placeholder="Add new rule"
                      style={tw`border border-gray-300 rounded-2xl px-4 py-2 font-poppins flex-1 mr-2`}
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity
                      onPress={handleAddRule}
                      style={tw`bg-blue-600 w-10 h-10 rounded-full items-center justify-center`}
                    >
                      <Ionicons name="add" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Current Host Info */}
              <View style={tw`bg-gray-50 rounded-2xl p-4 mb-6`}>
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 16,
                    marginBottom: 12,
                  }}
                >
                  Host Information
                </Text>

                <View style={tw`flex-row items-center`}>
                  <View style={tw`w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3`}>
                    <Ionicons name="person" size={20} color="#2563EB" />
                  </View>
                  <View>
                    <Text style={tw`font-poppins-bold text-gray-800`}>
                      {hostName || "Host"}
                    </Text>
                    <Text style={tw`font-poppins text-gray-500 text-sm`}>
                      Host {isHost ? "(You)" : ""}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={tw`flex-row space-x-3`}>
                <TouchableOpacity
                  onPress={onClose}
                  style={tw`flex-1 border border-gray-300 py-3 rounded-2xl items-center`}
                >
                  <Text style={tw`font-poppins-bold text-gray-700`}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveChanges}
                  disabled={!isHost}
                  style={[
                    tw`flex-1 py-3 rounded-2xl items-center`,
                    isHost ? tw`bg-blue-700` : tw`bg-gray-400`
                  ]}
                >
                  <Text style={tw`font-poppins-bold text-white`}>
                    Save Changes
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Delete Room Option */}
              {isHost && (
                <TouchableOpacity
                  onPress={handleDeleteRoom}
                  style={tw`border border-red-600 py-3 rounded-2xl items-center mt-6`}
                >
                  <View style={tw`flex-row items-center`}>
                    <Ionicons name="trash-outline" size={18} color="#DC2626" style={tw`mr-2`} />
                    <Text
                      style={{
                        fontFamily: "Poppins-SemiBold",
                        fontSize: 14,
                        color: "#DC2626",
                      }}
                    >
                      Delete Room
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </Pressable>
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

/* =====================================================
   SUB COMPONENTS
===================================================== */

function Card({ title, children }) {
  return (
    <View style={tw`bg-white rounded-3xl p-5 mb-5`}>
      <Text
        style={{
          fontFamily: "Poppins-SemiBold",
          fontSize: 16,
          marginBottom: 12,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ icon, text, highlight, color }) {
  return (
    <View style={tw`flex-row items-center mb-3`}>
      <Ionicons
        name={icon}
        size={18}
        color={color || (highlight ? "#2563EB" : "#6B7280")}
      />
      <Text
        style={[
          {
            fontFamily: "Poppins-Regular",
            fontSize: 14,
            marginLeft: 10,
          },
          highlight && {
            color: "#2563EB",
            fontFamily: "Poppins-SemiBold",
          },
          color && { color },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function Rule({ icon, text }) {
  return (
    <View style={tw`flex-row items-center mb-3`}>
      <Ionicons name={icon} size={18} color="#9CA3AF" />
      <Text
        style={{
          fontFamily: "Poppins-Regular",
          fontSize: 14,
          marginLeft: 10,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function Setting({ label, value }) {
  return (
    <View style={tw`flex-row justify-between mb-3`}>
      <Text
        style={{
          fontFamily: "Poppins-Regular",
          fontSize: 14,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: "Poppins-SemiBold",
          fontSize: 13,
          color: "#2563EB",
        }}
      >
        {value}
      </Text>
    </View>
  );
}