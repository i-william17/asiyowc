import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Shuffle } from "lucide-react-native";

import tw from "../../utils/tw";
import ConfirmModal from "../../components/community/ConfirmModal";
import ShimmerLoader from "../../components/ui/ShimmerLoader";
import { createOrGetDMChat } from "../../store/slices/communitySlice";
import {
  fetchDiscoverUsers,
  fetchRouletteUser
} from "../../store/slices/userSlice";

/* =====================================================
   HELPERS (SAFE + AUTHORITATIVE)
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

const normalizeId = (u) => {
  if (!u) return null;
  if (typeof u === "string") return String(u);
  if (u._id) return String(u._id);
  if (u.id) return String(u.id);
  if (u.user?._id) return String(u.user._id);
  return null;
};

/* =====================================================
   NETWORKING ROULETTE (MEMOIZED + SAFE)
===================================================== */

const NetworkingRoulette = React.memo(({ onMatch, loading }) => {
  return (
    <LinearGradient
      colors={["#7C3AED", "#6D28D9"]}
      style={tw`rounded-2xl p-6 mt-6 mx-6 shadow-lg`}
    >
      <View style={tw`flex-row items-center justify-between mb-4`}>
        <View>
          <Text
            style={[
              tw`text-white text-xl`,
              { fontFamily: "Poppins-Bold" },
            ]}
          >
            Networking Roulette
          </Text>
          <Text
            style={[
              tw`text-white/90 text-sm`,
              { fontFamily: "Poppins-Regular" },
            ]}
          >
            Connect with a random sister globally
          </Text>
        </View>

        <Shuffle size={28} color="#FFFFFF" />
      </View>

      <TouchableOpacity
        style={tw`bg-white rounded-full py-3 items-center`}
        onPress={loading ? null : onMatch}
        activeOpacity={0.85}
      >
        <Text
          style={[
            tw`text-purple-700`,
            { fontFamily: "Poppins-SemiBold" },
          ]}
        >
          {loading ? "Finding match..." : "Find a Match"}
        </Text>
      </TouchableOpacity>
    </LinearGradient>
  );
});

/* =====================================================
   NEW DIRECT MESSAGE SCREEN
===================================================== */

export default function NewChatScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const { token } = useSelector((s) => s.auth);

  const myId = getUserIdFromToken(token);
  const [query, setQuery] = useState("");
  const [chatSource, setChatSource] = useState("list");

  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const {
    discoverUsers,
    loading,
    loadingMore,
    page,
    hasMore,
    rouletteLoading
  } = useSelector((s) => s.user);

  /* =====================================================
     FETCH USERS
  ===================================================== */
  useEffect(() => {
    dispatch(fetchDiscoverUsers({ page: 1 }));
  }, [dispatch]);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;

    dispatch(fetchDiscoverUsers({ page: page + 1 }));
  };

  /* =====================================================
     FILTER USERS
  ===================================================== */

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();

    return (discoverUsers || [])
      .map((u) => ({ ...u, __uid: normalizeId(u) }))
      .filter((u) => u.__uid && u.__uid !== myId)
      .filter((u) => {
        if (!q) return true;
        return (u.profile?.fullName || "")
          .toLowerCase()
          .includes(q);
      });
  }, [discoverUsers, query, myId]);
  /* =====================================================
     START CHAT (NORMAL)
  ===================================================== */

  const startChat = async () => {
    try {
      const pid = normalizeId(selectedUser);
      if (!pid) return;

      const chat = await dispatch(
        createOrGetDMChat({ participantId: pid })
      ).unwrap();

      setConfirmVisible(false);
      setSelectedUser(null);

      router.replace(`/community/chat/${chat._id}`);
    } catch (err) {
      console.error(err);
    }
  };

  /* =====================================================
     ROULETTE MATCH
  ===================================================== */

  const startRandomChat = useCallback(async () => {
    try {
      const user = await dispatch(fetchRouletteUser()).unwrap();

      if (!user) return;

      setSelectedUser(user);
      setChatSource("roulette");   // ✅ add
      setConfirmVisible(true);

    } catch (err) {
      console.error(err);
    }
  }, [dispatch]);


  /* =====================================================
     USER ROW
  ===================================================== */

  const renderUser = ({ item }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedUser(item);
        setChatSource("list");
        setConfirmVisible(true);
      }}
      style={tw`flex-row items-center bg-white p-4 rounded-2xl mb-3 border border-gray-200`}
    >
      <Image
        source={
          item.profile?.avatar?.url
            ? { uri: item.profile.avatar.url }
            : require("../../assets/images/image-placeholder.png")
        }
        style={tw`w-12 h-12 rounded-full bg-gray-100`}
      />

      <View style={tw`ml-4 flex-1`}>
        <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 15 }}>
          {item.profile?.fullName || "User"}
        </Text>

        <Text
          style={{
            fontFamily: "Poppins-Regular",
            fontSize: 13,
            color: "#6B7280",
          }}
        >
          Tap to start chat
        </Text>
      </View>

      <Ionicons name="chatbubble-outline" size={20} color="#FFD700" />
    </TouchableOpacity>
  );

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <View style={tw`flex-1 bg-gray-50 px-6 pt-6`}>
        <ShimmerLoader />
      </View>
    );
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* HEADER */}
      <View
        style={[
          tw`px-6 pt-14 pb-6 rounded-b-3xl`,
          { backgroundColor: "#6A1B9A" },
        ]}
      >
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity onPress={() => router.back()} style={tw`mr-4`}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <Text
            style={{
              fontFamily: "Poppins-Bold",
              fontSize: 20,
              color: "#fff",
            }}
          >
            New Chat
          </Text>
        </View>

        {/* SEARCH */}
        <View style={tw`mt-5 bg-white rounded-full px-4 py-2 flex-row items-center`}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search users…"
            placeholderTextColor="#9CA3AF"
            style={[tw`flex-1 ml-3`, { fontFamily: "Poppins-Regular" }]}
          />
        </View>
      </View>

      {/* ROULETTE */}
      <NetworkingRoulette
        onMatch={startRandomChat}
        loading={rouletteLoading} />

      {/* USERS */}
      <FlatList
        data={filteredUsers}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}

        keyExtractor={(item) => item.__uid}
        renderItem={renderUser}
        contentContainerStyle={tw`px-6 pt-6 pb-10`}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          loadingMore ? (
            <View style={tw`py-6`}>
              <ShimmerLoader />
            </View>
          ) : null
        }
      />

      {/* CONFIRM */}
      <ConfirmModal
        visible={confirmVisible}
        title={
          chatSource === "roulette"
            ? "New Match Found!"
            : "Start chat?"
        }

        message={
          chatSource === "roulette"
            ? `We found ${selectedUser?.profile?.fullName || "someone"} for you. Want to connect and start chatting?`
            : `Start a conversation with ${selectedUser?.profile?.fullName || "this user"}?`
        }

        confirmText="Start Chat"
        cancelText="Cancel"
        onCancel={() => {
          setConfirmVisible(false);
          setSelectedUser(null);
        }}
        onConfirm={startChat}
      />
    </View>
  );
}
