import React, { useEffect, useState, useCallback, useRef } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Animated,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";

import tw from "../../utils/tw";
import useCommunitySocket from "../../hooks/useCommunitySocket";

import {
  fetchGroups,
  fetchChats,
  fetchVoices,
  fetchHubs,
  createVoiceRoom,
  createGroup,
} from "../../store/slices/communitySlice";

import GroupCard from "../../components/community/GroupCard";
import ChatCard from "../../components/community/ChatCard";
import VoiceCard from "../../components/community/VoiceCard";
import HubCard from "../../components/community/HubCard";
import LoadingBlock from "../../components/community/LoadingBlock";
import EmptyState from "../../components/community/EmptyState";

/* =====================================================
   HELPERS (SOURCE OF TRUTH = JWT)
===================================================== */

const getUserIdFromToken = (token) => {
  try {
    if (!token) return null;
    const base64 = token.split(".")[1];
    const payload = JSON.parse(atob(base64));
    return String(payload.id || payload._id || payload.userId);
  } catch {
    return null;
  }
};

export default function CommunityScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  useCommunitySocket();

  const { groups, chats, voices, hubs, loadingList } = useSelector(
    (s) => s.community
  );

  const { token } = useSelector((s) => s.auth);
  const myId = getUserIdFromToken(token);

  const [activeTab, setActiveTab] = useState("groups");
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateVoice, setShowCreateVoice] = useState(false);
  const [voiceTitle, setVoiceTitle] = useState("");
  const [creatingVoice, setCreatingVoice] = useState(false);
  const [scheduleMode, setScheduleMode] = useState("now");
  const [startDate, setStartDate] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [webTimeText, setWebTimeText] = useState("__:__");
  const [showWebTimePicker, setShowWebTimePicker] = useState(false);
  const [tempHour, setTempHour] = useState(null);
  const [pickerFadeAnim] = useState(new Animated.Value(0));

  // Group creation states
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupAvatar, setGroupAvatar] = useState("");
  const [groupPrivacy, setGroupPrivacy] = useState("public");
  const [creatingGroup, setCreatingGroup] = useState(false);

  const hourScrollRef = useRef(null);
  const minuteScrollRef = useRef(null);

  const fadeAnim = useState(new Animated.Value(0))[0];

  /* =====================================================
     ANIMATIONS
  ===================================================== */
  const animatePicker = (show) => {
    Animated.timing(pickerFadeAnim, {
      toValue: show ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    if (showWebTimePicker) {
      animatePicker(true);
    } else {
      animatePicker(false);
    }
  }, [showWebTimePicker]);

  /* =====================================================
     AUTO-SCROLL TO CURRENT TIME
  ===================================================== */
  useEffect(() => {
    if (showWebTimePicker && Platform.OS === "web") {
      // Auto-scroll to current hour
      const currentHour = startDate.getHours();
      const hourItemHeight = 40; // Approximate height of each hour item
      setTimeout(() => {
        if (hourScrollRef.current) {
          hourScrollRef.current.scrollTo({
            y: currentHour * hourItemHeight,
            animated: true,
          });
        }
      }, 100);

      // Auto-scroll to current minute (rounded to nearest 5)
      const currentMinute = Math.floor(startDate.getMinutes() / 5) * 5;
      const minuteItemHeight = 40; // Approximate height of each minute item
      setTimeout(() => {
        if (minuteScrollRef.current) {
          minuteScrollRef.current.scrollTo({
            y: (currentMinute / 5) * minuteItemHeight,
            animated: true,
          });
        }
      }, 150);
    }
  }, [showWebTimePicker]);

  /* =====================================================
     SYNC WEB TIME INPUT WHEN MODAL OPENS
  ===================================================== */
  useEffect(() => {
    if (!showCreateVoice) return;

    // When the modal opens, hydrate the web input from startDate
    const hh = String(startDate.getHours()).padStart(2, "0");
    const mm = String(startDate.getMinutes()).padStart(2, "0");
    setWebTimeText(`${hh}:${mm}`);
    setTempHour(null); // Reset temp hour when modal opens
  }, [showCreateVoice]);

  /* =====================================================
     LOADERS
  ===================================================== */
  const loadAll = async () => {
    await Promise.all([
      dispatch(fetchGroups()),
      dispatch(fetchChats()),
      dispatch(fetchVoices()),
      dispatch(fetchHubs()),
    ]);
  };

  useEffect(() => {
    loadAll();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchChats());
    }, [dispatch])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const getUnreadCount = (chat, myId) => {
    if (!chat || !myId) return 0;

    const state = Array.isArray(chat.readState)
      ? chat.readState.find((r) => String(r.user) === String(myId))
      : null;

    const lastReadSeq = state?.lastReadSeq || 0;
    const lastSeq = chat.lastSeq || 0;

    return Math.max(0, lastSeq - lastReadSeq);
  };

  const handleCreateVoice = async () => {
    if (!voiceTitle.trim() || creatingVoice) return;

    try {
      setCreatingVoice(true);

      let payload = {
        title: voiceTitle.trim(),
      };

      if (scheduleMode === "schedule") {
        if (durationMinutes < 30) {
          alert("Minimum duration is 30 minutes");
          setCreatingVoice(false);
          return;
        }

        const startsAt = startDate;

        const endsAt = new Date(
          startsAt.getTime() + durationMinutes * 60 * 1000
        );

        payload.startsAt = startsAt.toISOString();
        payload.endsAt = endsAt.toISOString();
      }

      const result = await dispatch(
        createVoiceRoom(payload)
      ).unwrap();

      setVoiceTitle("");
      setStartDate(new Date());
      setDurationMinutes(120);
      setScheduleMode("now");
      setShowCreateVoice(false);

      if (result?._id) {
        router.push(`/community/voice/${result._id}`);
      }

    } catch (err) {
      console.log("Create voice error:", err);
    } finally {
      setCreatingVoice(false);
    }
  };

  /* =====================================================
     CREATE GROUP HANDLER
  ===================================================== */
  const handleCreateGroup = async () => {
    if (!groupName.trim() || creatingGroup) return;

    try {
      setCreatingGroup(true);

      await dispatch(
        createGroup({
          name: groupName.trim(),
          description: groupDescription.trim(),
          avatar: groupAvatar.trim(),
          privacy: groupPrivacy,
        })
      ).unwrap();

      setShowCreateGroup(false);
      setGroupName("");
      setGroupDescription("");
      setGroupAvatar("");
      setGroupPrivacy("public");

    } catch (err) {
      console.log("Create group error:", err);
    } finally {
      setCreatingGroup(false);
    }
  };

  /* =====================================================
     TABS
  ===================================================== */
  const Tabs = () => (
    <View style={tw`px-1 -mt-4 mb-6`}>
      <View style={tw`bg-white rounded-2xl p-2 flex-row shadow-sm`}>
        {[
          { id: "groups", icon: "people", label: "Groups" },
          { id: "chats", icon: "chatbubbles", label: "Messages" },
          { id: "voices", icon: "mic", label: "Rooms" },
          { id: "hubs", icon: "earth", label: "Hubs" },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setActiveTab(t.id)}
            style={[
              tw`flex-1 py-3 rounded-xl flex-row justify-center items-center`,
              activeTab === t.id ? tw`bg-[#6A1B9A]` : tw`bg-transparent`,
            ]}
          >
            <Ionicons
              name={t.icon}
              size={18}
              color={activeTab === t.id ? "#fff" : "#6B7280"}
            />
            <Text
              style={{
                fontFamily: "Poppins-Medium",
                marginLeft: 6,
                color: activeTab === t.id ? "#fff" : "#6B7280",
              }}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  /* =====================================================
     CREATE CHAT ROW
  ===================================================== */
  const CreateChatRow = () => (
    <TouchableOpacity
      onPress={() => router.push("/community/new-chat")}
      activeOpacity={0.85}
      style={tw`flex-row items-center px-4 py-4 mb-3 bg-white border border-gray-200 rounded-2xl`}
    >
      <View style={tw`w-11 h-11 rounded-full bg-purple-600 items-center justify-center`}>
        <Ionicons name="add" size={22} color="#fff" />
      </View>

      <View style={tw`ml-4`}>
        <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 15 }}>
          New chat
        </Text>
        <Text
          style={{
            fontFamily: "Poppins-Regular",
            fontSize: 13,
            color: "#6B7280",
            marginTop: 2,
          }}
        >
          Start a conversation
        </Text>
      </View>
    </TouchableOpacity>
  );

  /* =====================================================
     CREATE VOICE ROW
  ===================================================== */
  const CreateVoiceRow = () => (
    <TouchableOpacity
      onPress={() => setShowCreateVoice(true)}
      activeOpacity={0.85}
      style={tw`flex-row items-center px-4 py-4 mb-3 bg-white border border-gray-200 rounded-2xl`}
    >
      <View style={tw`w-11 h-11 rounded-full bg-[#6A1B9A] items-center justify-center`}>
        <Ionicons name="mic" size={22} color="#fff" />
      </View>

      <View style={tw`ml-4`}>
        <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 15 }}>
          Create room
        </Text>
        <Text
          style={{
            fontFamily: "Poppins-Regular",
            fontSize: 13,
            color: "#6B7280",
            marginTop: 2,
          }}
        >
          Start a live voice conversation
        </Text>
      </View>
    </TouchableOpacity>
  );

  /* =====================================================
     CREATE GROUP ROW
  ===================================================== */
  const CreateGroupRow = () => (
    <TouchableOpacity
      onPress={() => setShowCreateGroup(true)}
      activeOpacity={0.85}
      style={tw`flex-row items-center px-4 py-4 mb-3 bg-white border border-gray-200 rounded-2xl`}
    >
      <View style={tw`w-11 h-11 rounded-full bg-[#6A1B9A] items-center justify-center`}>
        <Ionicons name="add" size={22} color="#fff" />
      </View>

      <View style={tw`ml-4`}>
        <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 15 }}>
          Create Group
        </Text>
        <Text style={{
          fontFamily: "Poppins-Regular",
          fontSize: 13,
          color: "#6B7280",
          marginTop: 2,
        }}>
          Start a new community space
        </Text>
      </View>
    </TouchableOpacity>
  );

  /* =====================================================
     CONTENT RENDERER
  ===================================================== */
  const renderList = () => {
    if (loadingList) return <LoadingBlock />;


    /* -------- GROUPS -------- */
    if (activeTab === "groups") {
      return (
        <>
          <CreateGroupRow />

          {!groups.length ? (
            <EmptyState
              title="No groups yet"
              subtitle="Join groups to connect with others."
            />
          ) : (
            groups.map((g) => {



              // 🔵 Calculate unread
              const unreadCount = g.unreadCount || 0;

              return (
                <GroupCard
                  key={g._id}
                  id={g._id}
                  name={g.name}
                  description={g.description}
                  avatar={g.avatar}
                  membersCount={g.membersCount}
                  isJoined={g.isMember}
                  unreadCount={unreadCount}   // ⭐ PASS UNREAD
                  onPress={(id) => {
                    if (g.isMember && g.chatId) {
                      router.push(`/community/group-chat/${g.chatId}`);
                    } else {
                      router.push(`/community/group/${id}`);
                    }
                  }}
                />
              );
            })
          )}
        </>
      );
    }

    /* -------- CHATS -------- */
    if (activeTab === "chats") {
      return (
        <>
          <CreateChatRow />

          {!chats || chats.length === 0 ? (
            <EmptyState
              title="No chats yet"
              subtitle="Start a conversation with someone."
            />
          ) : (
            chats.map((c) => {
              if (c.type !== "dm") return null;

              // Resolve receiver
              const other = c.participants?.find(
                (p) => String(p?._id) !== String(myId)
              );

              if (!other) return null;

              // 🔵 UNREAD COUNT (SOURCE OF TRUTH)
              const unreadCount = getUnreadCount(c, myId);

              // Last visible message
              const lastMessage =
                [...(c.messages || [])]
                  .reverse()
                  .find(
                    (m) =>
                      !m.isDeletedForEveryone &&
                      !(
                        Array.isArray(m.deletedFor) &&
                        m.deletedFor.map(String).includes(String(myId))
                      )
                  )?.ciphertext || "Open conversation";

              return (
                <ChatCard
                  key={c._id}
                  id={c._id}
                  title={other.profile?.fullName || "Chat"}
                  avatar={
                    other.profile?.avatar?.url ||
                    other.profile?.avatar ||
                    null
                  }
                  lastMessage={lastMessage}
                  unreadCount={unreadCount}
                  onPress={(id) => router.push(`/community/chat/${id}`)}
                />
              );
            })
          )}
        </>
      );
    }

    /* -------- VOICES -------- */
    if (activeTab === "voices") {
      return (
        <>
          <CreateVoiceRow />

          {!voices.length ? (
            <EmptyState
              title="No rooms yet"
              subtitle="Create or join a voice room."
            />
          ) : (
            voices.map((v) => (
              <VoiceCard
                key={v._id}
                id={v._id}
                title={v.title}
                hostName={v.host?.profile?.fullName || "Host"}
                listenersCount={v.listenersCount ?? 0}
                isLive={v.isLive}
                onPress={(id) => router.push(`/community/voice/${id}`)}
              />
            ))
          )}
        </>
      );
    }

    /* -------- HUBS -------- */
    if (activeTab === "hubs") {
      if (!hubs.length) {
        return (
          <EmptyState
            title="No hubs yet"
            subtitle="Join a hub to connect by region."
          />
        );
      }

      return hubs.map((hub) => (
        <HubCard
          key={hub._id}
          hub={hub}                 // 🔥 pass full object
          onPress={(id) => router.push(`/community/hub/${id}`)}
        />
      ));

    }

    return null;
  };

  /* =====================================================
     MAIN UI
  ===================================================== */
  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6A1B9A"]}
            tintColor="#6A1B9A"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#6A1B9A", "#6A1B9A"]}
          style={tw`px-6 pt-16 pb-10 rounded-b-3xl shadow-sm`}
        >
          <Text
            style={{
              fontFamily: "Poppins-Bold",
              fontSize: 26,
              color: "white",
            }}
          >
            Community
          </Text>
          <Text
            style={{
              fontFamily: "Poppins-Regular",
              marginTop: 4,
              color: "white",
              opacity: 0.85,
            }}
          >
            Interact with your sisters.
          </Text>
        </LinearGradient>

        <Tabs />
        <View style={tw`px-6 pb-10`}>{renderList()}</View>
      </Animated.ScrollView>

      {/* ================= CREATE VOICE MODAL (SINGLE-CONTROL TIME PICKER) ================= */}
      <Modal visible={showCreateVoice} animationType="slide" transparent>
        <View style={tw`flex-1 justify-end`}>

          {/* DARK OVERLAY - TAP TO DISMISS KEYBOARD OR CLOSE PICKER */}
          <TouchableWithoutFeedback
            onPress={() => {
              Keyboard.dismiss();
              if (showWebTimePicker) {
                setShowWebTimePicker(false);
                setTempHour(null);
              }
            }}
          >
            <View style={tw`absolute inset-0 bg-black/40`} />
          </TouchableWithoutFeedback>

          {/* SHEET - NO KEYBOARD DISMISSAL HERE */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          >
            <View style={tw`bg-white rounded-t-3xl px-6 pt-6 pb-10`}>

              {/* HEADER */}
              <View style={tw`flex-row justify-between items-center mb-6`}>
                <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 18 }}>
                  Create Voice Room
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    setShowCreateVoice(false);
                    setVoiceTitle("");
                    setScheduleMode("now");
                    setStartDate(new Date());
                    setDurationMinutes(120);
                    setWebTimeText(""); // Reset web time text
                    setTempHour(null); // Reset temp hour
                    setShowWebTimePicker(false);
                  }}
                >
                  <Ionicons name="close" size={22} />
                </TouchableOpacity>
              </View>

              {/* SEGMENTED TABS */}
              <View style={tw`flex-row bg-gray-100 rounded-xl p-1 mb-6`}>
                <TouchableOpacity
                  onPress={() => setScheduleMode("now")}
                  style={[
                    tw`flex-1 py-3 rounded-xl items-center flex-row justify-center`,
                    scheduleMode === "now" && tw`bg-white`
                  ]}
                >
                  <MaterialIcons
                    name="mic"
                    size={18}
                    color={scheduleMode === "now" ? "#6A1B9A" : "#6B7280"}
                  />
                  <Text
                    style={{
                      marginLeft: 6,
                      color: scheduleMode === "now" ? "#6A1B9A" : "#6B7280",
                      fontFamily: "Poppins-Medium",
                    }}
                  >
                    Go Live
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setScheduleMode("schedule")}
                  style={[
                    tw`flex-1 py-3 rounded-xl items-center flex-row justify-center`,
                    scheduleMode === "schedule" && tw`bg-white`
                  ]}
                >
                  <MaterialIcons
                    name="schedule"
                    size={18}
                    color={scheduleMode === "schedule" ? "#6A1B9A" : "#6B7280"}
                  />
                  <Text
                    style={{
                      marginLeft: 6,
                      color: scheduleMode === "schedule" ? "#6A1B9A" : "#6B7280",
                      fontFamily: "Poppins-Medium",
                    }}
                  >
                    Schedule
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TITLE */}
              <Text style={tw`mb-2 text-gray-700 font-poppins`}>
                Room Title
              </Text>
              <TextInput
                placeholder="Enter room title"
                value={voiceTitle}
                onChangeText={setVoiceTitle}
                style={tw`border border-gray-300 rounded-2xl px-4 py-4 mb-6 font-poppins`}
                placeholderTextColor="#9CA3AF"
              />

              {/* SCHEDULE MODE UI */}
              {scheduleMode === "schedule" && (
                <>

                  {/* TIME PICKER */}
                  <Text style={tw`mb-2 text-gray-700 font-poppins`}>
                    Start Time
                  </Text>

                  {Platform.OS === "web" ? (
                    <>
                      <TouchableOpacity
                        onPress={() => {
                          setShowWebTimePicker(!showWebTimePicker);
                          setTempHour(null); // Reset temp hour when opening picker
                        }}
                        style={tw`border border-gray-300 rounded-2xl px-4 py-4 mb-2 flex-row justify-between items-center`}
                      >
                        <Text style={tw`font-poppins`}>
                          {`${String(startDate.getHours()).padStart(2, "0")}:${String(
                            startDate.getMinutes()
                          ).padStart(2, "0")}`}
                        </Text>
                        <MaterialIcons name="access-time" size={20} color="#6A1B9A" />
                      </TouchableOpacity>

                      {showWebTimePicker && (
                        <Animated.View
                          style={{
                            opacity: pickerFadeAnim,
                            transform: [{
                              translateY: pickerFadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-10, 0]
                              })
                            }]
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: "white",
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: "#E5E7EB",
                              padding: 12,
                              marginBottom: 24,
                              flexDirection: "row",
                              maxHeight: 220,
                              shadowColor: "#000",
                              shadowOpacity: 0.1,
                              shadowRadius: 8,
                              elevation: 4,
                            }}
                          >
                            {/* HOURS COLUMN */}
                            <ScrollView
                              ref={hourScrollRef}
                              style={{ flex: 1 }}
                              showsVerticalScrollIndicator={true}
                              persistentScrollbar={true}
                            >
                              {Array.from({ length: 24 }).map((_, hour) => (
                                <TouchableOpacity
                                  key={hour}
                                  onPress={() => {
                                    setTempHour(hour); // Select hour first
                                  }}
                                  style={{
                                    paddingVertical: 8,
                                    alignItems: "center",
                                    backgroundColor:
                                      tempHour === hour ? "#6A1B9A" : "transparent",
                                    borderRadius: 8,
                                    marginBottom: 4,
                                  }}
                                >
                                  <Text
                                    style={{
                                      color:
                                        tempHour === hour ? "white" : "#374151",
                                      fontFamily: "Poppins-Medium",
                                    }}
                                  >
                                    {String(hour).padStart(2, "0")}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>

                            {/* MINUTES COLUMN */}
                            <ScrollView
                              ref={minuteScrollRef}
                              style={{ flex: 1 }}
                              showsVerticalScrollIndicator={true}
                              persistentScrollbar={true}
                            >
                              {Array.from({ length: 12 }).map((_, i) => {
                                const minute = i * 5; // 5-minute intervals
                                return (
                                  <TouchableOpacity
                                    key={minute}
                                    onPress={() => {
                                      if (tempHour === null) return; // Require hour first

                                      const updated = new Date(startDate);
                                      updated.setHours(tempHour);
                                      updated.setMinutes(minute);
                                      updated.setSeconds(0);
                                      updated.setMilliseconds(0);

                                      setStartDate(updated);
                                      setTempHour(null); // Reset temporary selection
                                      setShowWebTimePicker(false); // Close picker
                                    }}
                                    disabled={tempHour === null}
                                    style={{
                                      paddingVertical: 8,
                                      alignItems: "center",
                                      backgroundColor:
                                        startDate.getMinutes() === minute &&
                                          startDate.getHours() === tempHour
                                          ? "#6A1B9A"
                                          : "transparent",
                                      borderRadius: 8,
                                      marginBottom: 4,
                                      opacity: tempHour === null ? 0.4 : 1,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color:
                                          startDate.getMinutes() === minute &&
                                            startDate.getHours() === tempHour
                                            ? "white"
                                            : "#374151",
                                        fontFamily: "Poppins-Medium",
                                      }}
                                    >
                                      {String(minute).padStart(2, "0")}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </ScrollView>
                          </View>

                          {/* CANCEL BUTTON */}
                          <TouchableOpacity
                            onPress={() => {
                              setShowWebTimePicker(false);
                              setTempHour(null);
                            }}
                            style={{
                              backgroundColor: "#F3F4F6",
                              borderRadius: 12,
                              paddingVertical: 12,
                              alignItems: "center",
                              marginBottom: 24,
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: "Poppins-Medium",
                                color: "#6B7280",
                              }}
                            >
                              Cancel
                            </Text>
                          </TouchableOpacity>
                        </Animated.View>
                      )}
                    </>
                  ) : (
                    /* ===== MOBILE VERSION ===== */
                    <>
                      <TouchableOpacity
                        onPress={() => setShowTimePicker(true)}
                        style={tw`border border-gray-300 rounded-2xl px-4 py-4 mb-6 flex-row justify-between items-center`}
                      >
                        <Text style={tw`font-poppins`}>
                          {startDate.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>

                        <MaterialIcons name="access-time" size={20} color="#6A1B9A" />
                      </TouchableOpacity>

                      {showTimePicker && (
                        <DateTimePicker
                          value={startDate}
                          mode="time"
                          display="default"
                          onChange={(event, selectedDate) => {
                            setShowTimePicker(false);
                            if (selectedDate) setStartDate(selectedDate);
                          }}
                        />
                      )}
                    </>
                  )}

                  {/* DURATION SELECTOR */}
                  <Text style={tw`mb-2 text-gray-700 font-poppins`}>
                    Duration
                  </Text>

                  <View style={tw`flex-row flex-wrap mb-6`}>
                    {[30, 60, 90, 120].map((min) => (
                      <TouchableOpacity
                        key={min}
                        onPress={() => setDurationMinutes(min)}
                        style={[
                          tw`px-4 py-3 rounded-xl mr-3 mb-3`,
                          durationMinutes === min
                            ? tw`bg-[#6A1B9A]`
                            : tw`bg-gray-200`
                        ]}
                      >
                        <Text
                          style={{
                            color:
                              durationMinutes === min ? "#fff" : "#374151",
                            fontFamily: "Poppins-Medium",
                          }}
                        >
                          {min} min
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* INFO */}
              <View style={tw`flex-row items-start mb-6`}>
                <MaterialIcons
                  name="info-outline"
                  size={18}
                  color="#6B7280"
                />
                <Text
                  style={{
                    fontFamily: "Poppins-Regular",
                    fontSize: 12,
                    color: "#6B7280",
                    marginLeft: 6,
                    flex: 1,
                  }}
                >
                  Room opens 10 minutes before start time.
                  After the end time passes, the session ends.
                </Text>
              </View>

              {/* SUBMIT */}
              <TouchableOpacity
                onPress={handleCreateVoice}
                disabled={creatingVoice || !voiceTitle.trim()}
                style={[
                  tw`py-4 rounded-2xl items-center`,
                  voiceTitle.trim()
                    ? tw`bg-[#6A1B9A]`
                    : tw`bg-gray-300`
                ]}
              >
                {creatingVoice ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={{
                      fontFamily: "Poppins-SemiBold",
                      color: "white",
                      fontSize: 15,
                    }}
                  >
                    {scheduleMode === "now" ? "Go Live" : "Schedule Room"}
                  </Text>
                )}
              </TouchableOpacity>

            </View>
          </KeyboardAvoidingView>

        </View>
      </Modal>

      {/* ================= CREATE GROUP MODAL ================= */}
      <Modal visible={showCreateGroup} animationType="slide" transparent>
        <View style={tw`flex-1 justify-end bg-black/40`}>
          <View style={tw`bg-white rounded-t-3xl px-6 pt-6 pb-10`}>

            <View style={tw`flex-row justify-between items-center mb-6`}>
              <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 18 }}>
                Create Group
              </Text>

              <TouchableOpacity onPress={() => setShowCreateGroup(false)}>
                <Ionicons name="close" size={22} />
              </TouchableOpacity>
            </View>

            {/* Name */}
            <Text style={tw`mb-2 text-gray-700 font-poppins`}>Name</Text>
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Group name"
              style={tw`border border-gray-300 rounded-2xl px-4 py-4 mb-4 font-poppins`}
              placeholderTextColor="#9CA3AF"
            />

            {/* Description */}
            <Text style={tw`mb-2 text-gray-700 font-poppins`}>
              Description (max 200 words)
            </Text>
            <TextInput
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
              numberOfLines={4}
              style={tw`border border-gray-300 rounded-2xl px-4 py-4 mb-4 font-poppins`}
              placeholderTextColor="#9CA3AF"
              textAlignVertical="top"
            />

            {/* Avatar URL */}
            <Text style={tw`mb-2 text-gray-700 font-poppins`}>
              Avatar URL (optional)
            </Text>
            <TextInput
              value={groupAvatar}
              onChangeText={setGroupAvatar}
              placeholder="https://..."
              style={tw`border border-gray-300 rounded-2xl px-4 py-4 mb-4 font-poppins`}
              placeholderTextColor="#9CA3AF"
            />

            {/* Privacy */}
            <View style={tw`flex-row mb-6`}>
              {["public", "private"].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setGroupPrivacy(type)}
                  style={[
                    tw`flex-1 py-3 rounded-xl items-center`,
                    groupPrivacy === type
                      ? tw`bg-[#6A1B9A]`
                      : tw`bg-gray-200`
                  ]}
                >
                  <Text
                    style={{
                      color: groupPrivacy === type ? "#fff" : "#374151",
                      fontFamily: "Poppins-Medium",
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleCreateGroup}
              disabled={!groupName.trim() || creatingGroup}
              style={[
                tw`py-4 rounded-2xl items-center`,
                groupName.trim()
                  ? tw`bg-[#6A1B9A]`
                  : tw`bg-gray-300`
              ]}
            >
              {creatingGroup ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "white", fontFamily: "Poppins-SemiBold" }}>
                  Create
                </Text>
              )}
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}