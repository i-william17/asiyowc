// app/community/group/[id].js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Share,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import tw from "../../../utils/tw";
import LoadingBlock from "../../../components/community/LoadingBlock";
import EmptyState from "../../../components/community/EmptyState";
import ConfirmModal from "../../../components/community/ConfirmModal";
import {
  fetchGroupDetail,
  joinGroup,
  leaveGroup,
  generateGroupInviteLink,
  deleteGroup,
} from "../../../store/slices/communitySlice";
import { useSafeAreaInsets } from "react-native-safe-area-context";


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
  const [inviting, setInviting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const insets = useSafeAreaInsets();


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
     MEMBER ADMIN CHECK HELPER
  ===================================================== */
  const isMemberAdmin = (memberId) => {
    const id = String(memberId || "");
    const adminIds = Array.isArray(g.admins) ? g.admins.map((a) => String(a?._id || a)) : [];
    const creatorId = g.createdBy?._id ? String(g.createdBy._id) : (g.createdBy ? String(g.createdBy) : null);

    return adminIds.includes(id) || (creatorId && creatorId === id);
  };

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

      const res = await dispatch(
        joinGroup({
          groupId: g._id, // ✅ MUST be object
        })
      ).unwrap();

      setShowJoinModal(false);

      if (res?.chatId) {
        router.replace(`/community/group-chat/${res.chatId}`);
      }
    } catch (err) {
      console.error("[GroupDetail] ❌ Join failed:", err);
    }
  };

  const handleLeaveConfirmed = async () => {
    try {
      await dispatch(leaveGroup(g._id)).unwrap(); // ✅ raw id

      setShowLeaveModal(false);
      router.replace("/community");
    } catch (err) {
      console.error("[GroupDetail] ❌ Leave failed:", err);
    }
  };

  const handleInvite = async () => {
    if (inviting) return;

    try {
      setInviting(true);

      const res = await dispatch(
        generateGroupInviteLink(g._id) // ✅ raw id
      ).unwrap();

      const link = res?.inviteLink;
      if (!link) return;

      setInviteLink(link);
      setShowInviteModal(true);

    } catch (err) {
      console.log("Invite error:", err);
    } finally {
      setInviting(false);
    }
  };

  /* =====================================================
     DELETE HANDLER
  ===================================================== */
  const handleDeleteConfirmed = async () => {
    console.log("[GroupDetail] ✅ delete confirm pressed");
    if (deleting) return;

    try {
      setDeleting(true);

      await dispatch(deleteGroup(g._id)).unwrap();

      setShowDeleteModal(false);
      router.replace("/community");
    } catch (err) {
      console.error("[GroupDetail] ❌ Delete failed:", err);
    } finally {
      setDeleting(false);
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
   HEADER – GROUP INFO
===================================================== */}
        <View style={tw`px-6 pt-10 pb-6`}>
          <View style={tw`flex-row items-center`}>
            {/* Back Button */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={tw`w-11 h-11 items-center justify-center rounded-xl bg-white border border-gray-200`}
              hitSlop={12}
            >
              <Ionicons name="arrow-back" size={19} color="#111827" />
            </TouchableOpacity>

            {/* Title */}
            <Text
              style={{
                marginLeft: 16,
                fontFamily: "Poppins-SemiBold",
                fontSize: 20,
                color: "#111827",
              }}
            >
              Group Info
            </Text>
          </View>

          {/* Divider */}
          <View style={tw`mt-6 h-px bg-purple-600`} />
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
                  {typeof g.privacy === "string"
                    ? g.privacy.charAt(0).toUpperCase() + g.privacy.slice(1)
                    : ""}
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
                onPress={handleInvite}
                disabled={inviting}
                style={[
                  tw`ml-3 px-5 py-2.5 rounded-lg border border-gray-300`,
                  inviting && tw`opacity-50`
                ]}
              >
                <Text
                  style={{
                    fontFamily: "Poppins-Medium",
                    fontSize: 14,
                    color: "#374151",
                  }}
                >
                  {inviting ? "..." : "Invite"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* =====================================================
           POSTS
        ===================================================== */}
        {/* <View style={tw`px-6 mt-10`}>
          <Text
            style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 18,
              color: "#111827",
            }}
          >
            Posts
          </Text>


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
        </View> */}

        {/* =====================================================
           MEMBERS (Preview + Modal)
        ===================================================== */}
        <View style={tw`px-6 mt-10`}>
          <Text
            style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 18,
              color: "#111827",
            }}
          >
            Members
          </Text>

          {(!Array.isArray(g.members) || g.members.length === 0) ? (
            <EmptyState title="No members yet" subtitle="Group is empty." />
          ) : (
            <>
              {/* Preview first 5 */}
              {g.members.slice(0, 5).map((m) => {
                const memberAvatar = resolveImageUri(m.avatar);
                const admin = isMemberAdmin(m._id);

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

                    {/* Admin icon at far right */}
                    {admin && (
                      <View style={tw`ml-2`}>
                        <Ionicons name="person-circle" size={22} color="#7C3AED" />
                      </View>
                    )}
                  </View>
                );
              })}

              {/* View more row (only if > 5) */}
              {g.members.length > 5 && (
                <Pressable
                  onPress={() => setShowMembersModal(true)}
                  style={tw`mt-3 bg-white border border-gray-200 rounded-lg px-4 py-3 flex-row items-center justify-between`}
                >
                  <Text style={{ fontFamily: "Poppins-Medium", color: "#374151" }}>
                    View all members ({g.members.length})
                  </Text>

                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </Pressable>
              )}
            </>
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

        <ConfirmModal
          visible={showDeleteModal}
          danger
          title="Delete group?"
          message="This will permanently remove the group for everyone. This action cannot be undone."
          confirmText={deleting ? "Deleting..." : "Delete"}
          onCancel={() => (!deleting ? setShowDeleteModal(false) : null)}
          onConfirm={() => {
            if (deleting) return;
            handleDeleteConfirmed();
          }}
        />

        {/* =====================================================
           ADMIN ACTIONS
        ===================================================== */}
        {isAdmin && (
          <View style={tw`px-6 mt-10`}>
            <Text style={{
              fontFamily: "Poppins-SemiBold",
              fontSize: 18,
              color: "#111827",
            }}
            >
              ADMIN ACTIONS
            </Text>

            <View style={tw`bg-white border border-gray-200 rounded-xl mt-3`}>
              {/* <TouchableOpacity style={tw`px-5 py-4`}>
                <Text
                  style={{
                    fontFamily: "Poppins-Medium",
                    color: "#111827",
                  }}
                >
                  Edit group
                </Text>
              </TouchableOpacity> */}

              <View style={tw`h-px bg-gray-200`} />

              <TouchableOpacity
                onPress={() => setShowDeleteModal(true)}
                disabled={deleting}
                style={[
                  tw`px-5 py-4 flex-row items-center justify-between`,
                  deleting && tw`opacity-50`
                ]}
              >
                <Text
                  style={{
                    fontFamily: "Poppins-Medium",
                    color: "#DC2626",
                  }}
                >
                  Delete group
                </Text>

                {deleting ? <ActivityIndicator size="small" color="#DC2626" /> : null}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* =====================================================
         INVITE MODAL
      ===================================================== */}
      {showInviteModal && (
        <View
          style={[
            tw`absolute inset-0 bg-black/40 items-center justify-center px-6`,
            { paddingBottom: insets.bottom }
          ]}
        >
          <View style={tw`bg-white w-full rounded-2xl p-6`}>

            <Text
              style={{
                fontFamily: "Poppins-SemiBold",
                fontSize: 18,
                color: "#111827",
              }}
            >
              Invite Link
            </Text>

            <Text
              style={{
                fontFamily: "Poppins-Regular",
                fontSize: 13,
                color: "#6B7280",
                marginTop: 6,
              }}
            >
              Share this link with others to join the group.
            </Text>

            {/* LINK BOX */}
            <View style={tw`mt-4 p-3 bg-gray-100 rounded-lg`}>
              <Text
                selectable
                style={{
                  fontFamily: "Poppins-Regular",
                  fontSize: 13,
                  color: "#374151",
                }}
              >
                {inviteLink}
              </Text>
            </View>

            {/* ACTIONS */}
            <View style={tw`flex-row mt-5`}>

              <TouchableOpacity
                onPress={async () => {
                  await Clipboard.setStringAsync(inviteLink);
                }}
                style={tw`flex-1 py-3 rounded-lg border border-gray-300 items-center`}
              >
                <Text style={{ fontFamily: "Poppins-Medium" }}>
                  Copy
                </Text>
              </TouchableOpacity>

              {/* <TouchableOpacity
                onPress={async () => {
                  await Share.share({ message: inviteLink });
                }}
                style={tw`flex-1 ml-3 py-3 rounded-lg bg-purple-600 items-center`}
              >
                <Text style={{ fontFamily: "Poppins-Medium", color: "#fff" }}>
                  Share
                </Text>
              </TouchableOpacity> */}

            </View>

            <TouchableOpacity
              onPress={() => {
                setShowInviteModal(false);
                setInviteLink(null);
              }}
              style={tw`mt-5 items-center`}
            >
              <Text style={{ fontFamily: "Poppins-Medium", color: "#6B7280" }}>
                Close
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      )}

      {/* =====================================================
   MEMBERS BOTTOM SHEET (Proper Bottom Drawer)
===================================================== */}
      <Modal
        visible={showMembersModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowMembersModal(false)}
      >
        <Pressable
          style={tw`flex-1 bg-black/40 justify-end`}
          onPress={() => setShowMembersModal(false)}
        >
          <Pressable
            style={[
              tw`bg-white rounded-t-3xl`,
              {
                maxHeight: "85%",
                paddingBottom: insets.bottom,
              },
            ]}
            onPress={() => { }} // Prevent backdrop close when tapping inside
          >
            {/* Drag Indicator */}
            <View style={tw`items-center pt-3`}>
              <View style={tw`w-12 h-1.5 bg-gray-300 rounded-full`} />
            </View>

            {/* Header */}
            <View style={tw`px-6 pt-4 pb-3 border-b border-gray-200 flex-row items-center justify-between`}>
              <Text
                style={{
                  fontFamily: "Poppins-SemiBold",
                  fontSize: 18,
                  color: "#111827",
                }}
              >
                Members ({g.members?.length || 0})
              </Text>

              <TouchableOpacity
                onPress={() => setShowMembersModal(false)}
                style={tw`w-10 h-10 items-center justify-center rounded-xl bg-gray-100`}
              >
                <Ionicons name="close" size={18} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Scrollable List */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={tw`px-6 pt-4 pb-10`}
            >
              {g.members.map((m) => {
                const memberAvatar = resolveImageUri(m.avatar);
                const admin = isMemberAdmin(m._id);

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
                      style={tw`w-10 h-10 rounded-full bg-gray-200`}
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

                    {admin && (
                      <Ionicons name="person-circle" size={22} color="#7C3AED" />
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}