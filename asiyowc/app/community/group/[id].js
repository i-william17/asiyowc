import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import tw from "../../../utils/tw";
import LoadingBlock from "../../../components/community/LoadingBlock";
import EmptyState from "../../../components/community/EmptyState";
import ConfirmModal from "../../../components/community/ConfirmModal";
import {
  fetchGroupDetail,
  joinGroup,
  leaveGroup,
} from "../../../store/slices/communitySlice";

/* =====================================================
   🔒 MOBILE-SAFE IMAGE NORMALIZER
   Fixes: "Value for uri cannot be cast..."
===================================================== */
const resolveImageUri = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return value.secure_url || value.url || null;
  }
  return null;
};

export default function GroupDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();

  const { selectedGroup, loadingDetail, error } = useSelector(
    (s) => s.community
  );

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showAlreadyMemberModal, setShowAlreadyMemberModal] = useState(false);

  /* =====================================================
     FETCH GROUP
  ===================================================== */
  useEffect(() => {
    if (id) dispatch(fetchGroupDetail(id));
  }, [id]);

  if (loadingDetail) return <LoadingBlock />;

  if (!selectedGroup)
    return (
      <EmptyState
        title="Group unavailable"
        subtitle={error || "This group could not be loaded."}
      />
    );

  const g = selectedGroup;

  const avatarUri = resolveImageUri(g.avatar);
  const isMember = !!g.isMember;
  const isAdmin = !!g.isAdmin;

  /* =====================================================
     JOIN / LEAVE HANDLERS
  ===================================================== */
  const handleJoinConfirmed = async () => {
    try {
      if (isMember) {
        setShowJoinModal(false);
        setShowAlreadyMemberModal(true);
        return;
      }

      const res = await dispatch(joinGroup(g._id)).unwrap();
      if (!res?.chatId) return;

      setShowJoinModal(false);
      router.replace(`/community/group-chat/${g.chatId}`);
    } catch (err) {
      console.error("[GroupDetail] ❌ Join failed:", err);
    }
  };

  const handleLeaveConfirmed = async () => {
    try {
      const res = await dispatch(leaveGroup(g._id)).unwrap();
      if (!res || res._id !== g._id) return;

      setShowLeaveModal(false);
      router.replace("/community");
    } catch (err) {
      console.error("[GroupDetail] ❌ Leave failed:", err);
    }
  };

  const goToGroupChat = () => {
    // 🔐 must be member
    if (!g.isMember) return;

    // 🚨 chatId must already exist
    if (!g.chatId) {
      console.error("[GroupDetail] ❌ chatId missing for member group");
      return;
    }

    router.push(`/community/group-chat/${g.chatId}`);
  };


  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-12`}
      >
        {/* =====================================================
           HEADER
        ===================================================== */}
        <View style={tw`px-6 pt-6`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`w-10 h-10 items-center justify-center rounded-lg bg-white border border-gray-200`}
          >
            <Ionicons name="arrow-back" size={18} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* =====================================================
           GROUP SUMMARY
        ===================================================== */}
        <View style={tw`px-6 mt-6`}>
          <View style={tw`bg-white border border-gray-200 rounded-xl p-5`}>
            <View style={tw`flex-row items-center`}>
              <Image
                source={
                  avatarUri
                    ? { uri: avatarUri }
                    : require("../../../assets/images/image-placeholder.png")
                }
                style={tw`w-16 h-16 rounded-lg bg-gray-100`}
              />

              <View style={tw`ml-4 flex-1`}>
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 18,
                    color: "#111827",
                  }}
                >
                  {g.name}
                </Text>

                <Text
                  style={{
                    fontFamily: "Poppins-Regular",
                    fontSize: 13,
                    color: "#6B7280",
                    marginTop: 2,
                  }}
                >
                  {g.membersCount ?? g.members?.length ?? 0} members •{" "}
                  {g.privacy}
                </Text>
              </View>
            </View>

            {!!g.description && (
              <Text
                style={{
                  fontFamily: "Poppins-Regular",
                  fontSize: 14,
                  color: "#374151",
                  marginTop: 14,
                  lineHeight: 22,
                }}
              >
                {g.description}
              </Text>
            )}

            {/* =====================================================
               ACTION BUTTONS
            ===================================================== */}
            <View style={tw`mt-5 flex-row`}>
              {!isMember ? (
                <TouchableOpacity
                  onPress={() => setShowJoinModal(true)}
                  style={tw`px-5 py-2.5 rounded-lg border border-purple-600`}
                >
                  <Text
                    style={{
                      fontFamily: "Poppins-Medium",
                      fontSize: 14,
                      color: "#7C3AED",
                    }}
                  >
                    Join Group
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={goToGroupChat}
                    style={tw`px-5 py-2.5 rounded-lg bg-purple-600`}
                  >
                    <Text
                      style={{
                        fontFamily: "Poppins-Medium",
                        fontSize: 14,
                        color: "#fff",
                      }}
                    >
                      Enter Chat
                    </Text>
                  </TouchableOpacity>



                  <TouchableOpacity
                    onPress={() => setShowLeaveModal(true)}
                    style={tw`ml-3 px-5 py-2.5 rounded-lg border border-gray-300`}
                  >
                    <Text
                      style={{
                        fontFamily: "Poppins-Medium",
                        fontSize: 14,
                        color: "#374151",
                      }}
                    >
                      Leave
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={tw`ml-3 px-5 py-2.5 rounded-lg border border-gray-300`}
              >
                <Text
                  style={{
                    fontFamily: "Poppins-Medium",
                    fontSize: 14,
                    color: "#374151",
                  }}
                >
                  Invite
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* =====================================================
           POSTS
        ===================================================== */}
        <View style={tw`px-6 mt-10`}>
          <Text style={tw`text-lg font-semibold text-gray-900`}>Posts</Text>

          {!g.posts?.length ? (
            <EmptyState
              title="No posts yet"
              subtitle="Posts shared in this group will appear here."
            />
          ) : (
            g.posts.map((p) => (
              <View
                key={p._id}
                style={tw`bg-white border border-gray-200 rounded-xl p-4 mt-4`}
              >
                <Text style={tw`font-medium text-gray-900`}>
                  {p.author?.name || "Member"}
                </Text>
                <Text style={tw`text-gray-600 mt-2`}>
                  {p.content}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* =====================================================
           MEMBERS
        ===================================================== */}
        <View style={tw`px-6 mt-10`}>
          <Text style={tw`text-lg font-semibold text-gray-900`}>
            Members
          </Text>

          {!Array.isArray(g.members) || g.members.length === 0 ? (
            <EmptyState title="No members yet" subtitle="Group is empty." />
          ) : (
            g.members.map((m) => {
              const memberAvatar = resolveImageUri(m.avatar);

              return (
                <View
                  key={m._id}
                  style={tw`bg-white border border-gray-200 rounded-lg px-4 py-3 mt-3 flex-row items-center`}
                >
                  <Image
                    source={
                      memberAvatar
                        ? { uri: memberAvatar }
                        : require("../../../assets/images/image-placeholder.png")
                    }
                    style={tw`w-9 h-9 rounded-full bg-gray-200`}
                  />

                  <View style={tw`ml-3 flex-1`}>
                    <Text
                      style={{
                        fontFamily: "Poppins-Medium",
                        color: "#111827",
                      }}
                    >
                      {m.fullName || "Member"}
                    </Text>

                    {!!m.joinedAt && (
                      <Text
                        style={{
                          fontFamily: "Poppins-Regular",
                          fontSize: 12,
                          color: "#6B7280",
                          marginTop: 2,
                        }}
                      >
                        Joined {new Date(m.joinedAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* =====================================================
           MODALS
        ===================================================== */}
        <ConfirmModal
          visible={showJoinModal}
          title="Join this group?"
          message="You will be able to view posts and participate in the group chat."
          confirmText="Join"
          onCancel={() => setShowJoinModal(false)}
          onConfirm={handleJoinConfirmed}
        />

        <ConfirmModal
          visible={showAlreadyMemberModal}
          title="Already a member"
          message="You already belong to this group."
          confirmText="Go to chat"
          onCancel={() => setShowAlreadyMemberModal(false)}
          onConfirm={() => {
            setShowAlreadyMemberModal(false);
            router.push(`/community/group-chat/${g.chatId}`);
          }}
        />

        <ConfirmModal
          visible={showLeaveModal}
          danger
          title="Leave group?"
          message="You will lose access to the group chat and posts."
          confirmText="Leave"
          onCancel={() => setShowLeaveModal(false)}
          onConfirm={handleLeaveConfirmed}
        />

        {/* =====================================================
           ADMIN ACTIONS
        ===================================================== */}
        {isAdmin && (
          <View style={tw`px-6 mt-10`}>
            <Text style={tw`text-sm font-semibold text-gray-500`}>
              ADMIN ACTIONS
            </Text>

            <View style={tw`bg-white border border-gray-200 rounded-xl mt-3`}>
              <TouchableOpacity style={tw`px-5 py-4`}>
                <Text
                  style={{
                    fontFamily: "Poppins-Medium",
                    color: "#111827",
                  }}
                >
                  Edit group
                </Text>
              </TouchableOpacity>

              <View style={tw`h-px bg-gray-200`} />

              <TouchableOpacity style={tw`px-5 py-4`}>
                <Text
                  style={{
                    fontFamily: "Poppins-Medium",
                    color: "#DC2626",
                  }}
                >
                  Archive group
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
