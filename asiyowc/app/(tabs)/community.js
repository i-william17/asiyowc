import React, { useEffect, useState, useCallback } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Animated,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import tw from "../../utils/tw";
import useCommunitySocket from "../../hooks/useCommunitySocket";

import {
  fetchGroups,
  fetchChats,
  fetchVoices,
  fetchHubs,
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

  const fadeAnim = useState(new Animated.Value(0))[0];

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
    if (!chat?.messages || !myId) return 0;

    return chat.messages.filter((m) => {
      if (!m?._id) return false;

      // Ignore my own messages
      if (String(m.sender?._id || m.sender) === String(myId)) return false;

      // Ignore deleted-for-me
      if (
        Array.isArray(m.deletedFor) &&
        m.deletedFor.map(String).includes(String(myId))
      ) {
        return false;
      }

      // Unread if readBy does NOT include me
      const readBy = Array.isArray(m.readBy) ? m.readBy : [];
      const hasRead = readBy.some(
        (r) => String(r.user || r) === String(myId)
      );

      return !hasRead;
    }).length;
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
              activeTab === t.id ? tw`bg-purple-600` : tw`bg-transparent`,
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
     CONTENT RENDERER
  ===================================================== */
  const renderList = () => {
    if (loadingList) return <LoadingBlock />;

    /* -------- GROUPS -------- */
    if (activeTab === "groups") {
      if (!groups.length) {
        return (
          <EmptyState
            title="No groups yet"
            subtitle="Join groups to connect with others."
          />
        );
      }

      return groups.map((g) => (
        <GroupCard
          key={g._id}
          id={g._id}
          name={g.name}
          description={g.description}
          avatar={g.avatar}
          membersCount={g.membersCount}
          isJoined={g.isMember}
          onPress={(id) => {
            if (g.isMember && g.chatId) {
              router.push(`/community/group-chat/${g.chatId}`);
            } else {
              router.push(`/community/group/${id}`);
            }
          }}
        />
      ));
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
      if (!voices.length) {
        return (
          <EmptyState
            title="No rooms yet"
            subtitle="Create or join a voice room."
          />
        );
      }

      return voices.map((v) => (
        <VoiceCard
          key={v._id}
          id={v._id}
          title={v.title}
          hostName={v.host?.profile?.fullName || "Host"}
          listenersCount={v.listenersCount ?? 0}
          isLive={v.isLive}
          onPress={(id) => router.push(`/community/voice/${id}`)}
        />
      ));
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

      return hubs.map((h) => (
        <HubCard
          key={h._id}
          id={h._id}
          name={h.name}
          members={h.members?.length ?? 0}
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
          colors={["#6A1B9A", "#8E24AA"]}
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
    </SafeAreaView>
  );
}
