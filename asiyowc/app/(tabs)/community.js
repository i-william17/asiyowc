import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
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

export default function CommunityScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  useCommunitySocket();

  const { groups, chats, voices, hubs, loadingList } = useSelector(
    (s) => s.community
  );

  const [activeTab, setActiveTab] = useState("groups");
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useState(new Animated.Value(0))[0];


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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  /* ============================================================
     TABS
  ============================================================= */

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
              activeTab === t.id
                ? tw`bg-purple-600`
                : tw`bg-transparent`,
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

  /* ============================================================
     CONTENT RENDERER
  ============================================================= */

  const renderList = () => {
    if (loadingList) return <LoadingBlock />;

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
        console.log(g),
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
              console.log("Navigating to group chat:", g.chatId);
              router.push(`/community/group-chat/${g.chatId}`);
            } else {
              console.log("Navigating to Group Details:", id);
              router.push(`/community/group/${id}`);
            }
          }}

        />

      ));
    }

    if (activeTab === "chats") {
      if (!chats.length) {
        return (
          <EmptyState
            title="No chats yet"
            subtitle="Start a conversation from a user profile."
          />
        );
      }

      return chats.map((c) => (
        <ChatCard
          key={c._id}
          id={c._id}
          title={c.title || "Chat"}
          lastMessage={c.lastMessage || "Open conversation"}
          onPress={(id) => router.push(`/community/chat/${id}`)}
        />
      ));
    }

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
          isLive={v.isLive}
          onPress={(id) => router.push(`/community/voice/${id}`)}
        />
      ));
    }

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

  /* ============================================================
     MAIN UI
  ============================================================= */

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
        {/* HEADER */}
        <LinearGradient
          colors={["#6A1B9A", "#8E24AA"]}
          style={tw`px-6 pt-16 pb-10 rounded-b-3xl shadow-sm`}
        >
          <View style={tw`flex-row justify-between items-center`}>
            <View>
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
            </View>
          </View>
        </LinearGradient>

        {/* TABS */}
        <Tabs />

        {/* CONTENT */}
        <View style={tw`px-6 pb-10`}>{renderList()}</View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
