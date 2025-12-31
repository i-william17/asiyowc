import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { server } from "../../server";
import tw from "../../utils/tw";
import ConfirmModal from "../../components/community/ConfirmModal";
import ShimmerLoader from "../../components/ui/ShimmerLoader";
import { createOrGetDMChat } from "../../store/slices/communitySlice";

/* =====================================================
   HELPERS (AUTHORITATIVE & SAFE)
===================================================== */

// ✅ Extract userId from JWT token (SOURCE OF TRUTH)
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

// ✅ Normalize ANY backend user shape
const normalizeId = (u) => {
  if (!u) return null;
  if (typeof u === "string") return String(u);
  if (u._id) return String(u._id);
  if (u.id) return String(u.id);
  if (u.user?._id) return String(u.user._id);
  return null;
};

/* =====================================================
   NEW DIRECT MESSAGE CHAT SCREEN (FINAL)
===================================================== */

export default function NewChatScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const { token } = useSelector((s) => s.auth);

  // 🔒 ONLY SOURCE OF TRUTH
  const myId = getUserIdFromToken(token);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  /* =====================================================
     FETCH USERS
  ===================================================== */
  useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      try {
        const res = await axios.get(`${server}/users/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!mounted) return;

        const payload = res.data;

        const list =
          Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.data?.users)
            ? payload.data.users
            : Array.isArray(payload?.users)
            ? payload.users
            : [];

        setUsers(list);
      } catch (err) {
        console.error("[NewChat] ❌ Failed to fetch users", err);
        setUsers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (token) loadUsers();

    return () => {
      mounted = false;
    };
  }, [token]);

  /* =====================================================
     FILTER USERS (TOKEN-BASED SELF EXCLUSION)
  ===================================================== */
  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();

    return (Array.isArray(users) ? users : [])
      .map((u) => ({ ...u, __uid: normalizeId(u) }))
      .filter((u) => u.__uid)          // valid ID only
      .filter((u) => u.__uid !== myId) // ❗ exclude SELF (JWT)
      .filter((u) => {
        if (!q) return true;
        return (u.profile?.fullName || "")
          .toLowerCase()
          .includes(q);
      });
  }, [users, query, myId]);

  /* =====================================================
     START / CREATE DM CHAT
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
      console.error("[NewChat] ❌ Failed to start chat", err);
    }
  };

  /* =====================================================
     USER ITEM
  ===================================================== */
  const renderUser = ({ item }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedUser(item);
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

      <Ionicons name="chatbubble-outline" size={20} color="#6A1B9A" />
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
      <View style={tw`px-6 pt-14 pb-6 bg-purple-700 rounded-b-3xl`}>
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

      {/* USERS */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.__uid}
        renderItem={renderUser}
        contentContainerStyle={tw`px-6 pt-6 pb-10`}
        showsVerticalScrollIndicator={false}
      />

      {/* CONFIRM MODAL */}
      <ConfirmModal
        visible={confirmVisible}
        title="Start chat?"
        message={`Start a conversation with ${
          selectedUser?.profile?.fullName || "this user"
        }?`}
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
