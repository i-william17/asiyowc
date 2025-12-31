import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
  Modal,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { Swipeable } from "react-native-gesture-handler";
import { decode as atob } from "base-64";

import {
  fetchGroupConversation,
  fetchGroupMessages,
  sendGroupMessage,
  pushIncomingMessage,
  leaveGroup,
} from "../../store/slices/communitySlice";
import ConfirmModal from "../../components/community/ConfirmModal";

import { connectSocket } from "../../services/socket";
import tw from "../../utils/tw";
import ShimmerLoader from "../../components/ui/ShimmerLoader";

/* =====================================================
   GROUP CHAT INTERFACE (PROFESSIONAL - FIXED VERSION)
===================================================== */

export default function GroupChatInterface({ chatId }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const listRef = useRef(null);
  const socketRef = useRef(null);
  const typingStopTimerRef = useRef(null);

  const { token, user } = useSelector((s) => s.auth);
  const { selectedChat, loadingDetail } = useSelector((s) => s.community);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [inputHeight, setInputHeight] = useState(0);
  const hasAutoScrolledRef = useRef(false);

  console.log("TOKEN AND USER:", token, user);

  const getUserIdFromToken = (tkn) => {
    try {
      if (!tkn) return null;
      const base64 = tkn.split(".")[1];
      const payload = JSON.parse(atob(base64));
      return payload?.id || null;
    } catch {
      return null;
    }
  };

  const insets = useSafeAreaInsets();

  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());
  const [typingUserIds, setTypingUserIds] = useState(() => new Set());
  const [contextMessage, setContextMessage] = useState(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [pinnedMessageIds, setPinnedMessageIds] = useState(() => new Set());
  const [reactionsByMessageId, setReactionsByMessageId] = useState({});
  const [hiddenMessageIds, setHiddenMessageIds] = useState(() => new Set());

  const resolvedUserId = user?._id || getUserIdFromToken(token);

  const group = selectedChat?.group;
  const groupId = group?._id;
  const members = group?.members || [];
  const messages = selectedChat?.messages || [];

  /* =====================================================
     HELPERS (FIXED ORDER)
  ===================================================== */

  const safeId = (v) => {
    if (!v) return null;
    if (typeof v === "string") return v;
    if (typeof v === "object") return String(v._id || v.id || "");
    return null;
  };

  const getSenderId = (msg) => {
    const sid =
      safeId(msg?.sender?._id) || safeId(msg?.sender?.id) || safeId(msg?.sender);
    return sid ? String(sid) : null;
  };

  const getMyId = () => (resolvedUserId ? String(resolvedUserId) : null);

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const formatDateLabel = (date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(date, today)) return "Today";
    if (isSameDay(date, yesterday)) return "Yesterday";

    return date.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (date) => {
    if (!date) return "";
    try {
      return new Date(date).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const getMemberById = (id) => {
    if (!id) return null;
    const found = members.find((m) => {
      const uid = safeId(m?.user?._id) || safeId(m?.user?.id) || safeId(m?.user);
      return uid && String(uid) === String(id);
    });
    return found || null;
  };

  const getMemberName = (id) => {
    const m = getMemberById(id);
    const fromMember =
      m?.user?.profile?.fullName ||
      m?.user?.fullName ||
      m?.user?.name ||
      m?.fullName ||
      null;
    return fromMember || "Member";
  };

  const getMemberAvatar = (id) => {
    const m = getMemberById(id);
    const av =
      m?.user?.profile?.avatar?.url ||
      m?.user?.profile?.avatar ||
      m?.user?.avatar?.url ||
      m?.user?.avatar ||
      m?.avatar?.url ||
      m?.avatar ||
      null;
    return av || null;
  };

  const getSenderNameFromMessage = (msg) => msg?.sender?.profile?.fullName || "Member";

  const getSenderAvatarFromMessage = (msg) =>
    msg?.sender?.profile?.avatar?.url || msg?.sender?.profile?.avatar || null;

  const copyToClipboard = async (value) => {
    const textToCopy = String(value ?? "");
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        return true;
      }
    } catch { }
    return false;
  };

  /* =====================================================
     PIN / UNPIN
  ===================================================== */
  const togglePinMessage = (message) => {
    if (!message?._id) return;
    setPinnedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(String(message._id))) next.delete(String(message._id));
      else next.add(String(message._id));
      return next;
    });

    // Emit socket event
    try {
      socketRef.current?.emit("message:pin", { chatId, messageId: message._id });
    } catch { }
  };

  const pinnedMessages = useMemo(() => {
    const ids = pinnedMessageIds;
    if (!ids.size) return [];
    return messages.filter((m) => ids.has(String(m._id)));
  }, [messages, pinnedMessageIds]);

  /* =====================================================
     REACTIONS
  ===================================================== */
  const toggleReaction = (message, emoji) => {
    const myId = getMyId();
    if (!message?._id || !emoji || !myId) return;

    setReactionsByMessageId((prev) => {
      const mid = String(message._id);
      const current = prev[mid] || {};
      const users = new Set((current[emoji] || []).map(String));

      if (users.has(myId)) users.delete(myId);
      else users.add(myId);

      const nextForMsg = { ...current, [emoji]: Array.from(users) };

      if ((nextForMsg[emoji] || []).length === 0) {
        const cleaned = { ...nextForMsg };
        delete cleaned[emoji];
        return { ...prev, [mid]: cleaned };
      }

      return { ...prev, [mid]: nextForMsg };
    });

    // Emit socket event
    try {
      socketRef.current?.emit("message:reaction", {
        chatId,
        messageId: message._id,
        emoji,
      });
    } catch { }
  };

  const getReactionSummary = (message) => {
    const mid = String(message?._id || "");
    const local = reactionsByMessageId[mid] || {};
    const keys = Object.keys(local);
    if (!keys.length) return [];
    return keys
      .map((emoji) => ({
        emoji,
        count: Array.isArray(local[emoji]) ? local[emoji].length : 0,
      }))
      .filter((x) => x.count > 0)
      .slice(0, 4);
  };

  /* =====================================================
     READ RECEIPTS
  ===================================================== */
  const getReceiptState = (message, isMine) => {
    if (!isMine) return { icon: null, color: null };

    const delivered =
      !!message?.deliveredAt ||
      message?.status === "delivered" ||
      message?.status === "received";

    const read =
      !!message?.readAt ||
      message?.status === "read" ||
      (Array.isArray(message?.readBy) && message.readBy.length > 0);

    if (read) return { icon: "checkmark-done", color: "#2563EB" };
    if (delivered) return { icon: "checkmark-done", color: "#9CA3AF" };
    return { icon: "checkmark", color: "#9CA3AF" };
  };

  /* =====================================================
     TYPING EMITS
  ===================================================== */
  const emitTypingStart = () => {
    if (!socketRef.current || !groupId) return;
    socketRef.current.emit("group:typing:start", { groupId });
  };

  const emitTypingStop = () => {
    if (!socketRef.current || !groupId) return;
    socketRef.current.emit("group:typing:stop", { groupId });
  };

  const scheduleTypingStop = () => {
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => {
      emitTypingStop();
    }, 900);
  };

  /* =====================================================
     MESSAGE PROCESSING (FIXED ORDER)
  ===================================================== */
  const uniqueMessages = useMemo(() => {
    const map = new Map();
    messages.forEach((m) => {
      if (m?._id) {
        map.set(String(m._id), m);
      }
    });
    return Array.from(map.values());
  }, [messages]);

  const visibleMessages = useMemo(() => {
    if (!hiddenMessageIds.size) return uniqueMessages;
    return uniqueMessages.filter(
      (m) => !hiddenMessageIds.has(String(m._id))
    );
  }, [uniqueMessages, hiddenMessageIds]);

  const sortedMessages = useMemo(() => {
    return [...visibleMessages].sort(
      (a, b) =>
        new Date(a.createdAt || a.updatedAt) -
        new Date(b.createdAt || b.updatedAt)
    );
  }, [visibleMessages]);

  const messagesWithDates = useMemo(() => {
    const result = [];
    let lastDate = null;

    sortedMessages.forEach((msg) => {
      const raw = msg?.createdAt || msg?.updatedAt;
      const msgDate = raw ? new Date(raw) : new Date();

      if (!lastDate || !isSameDay(msgDate, lastDate)) {
        result.push({
          _id: `date-${msgDate.toISOString()}`,
          type: "date",
          label: formatDateLabel(msgDate),
        });
        lastDate = msgDate;
      }

      result.push({
        ...msg,
        type: "message",
      });
    });

    return result;
  }, [sortedMessages]);

  /* =====================================================
     LOAD GROUP CHAT
  ===================================================== */
  useEffect(() => {
    if (chatId) dispatch(fetchGroupConversation(chatId));
  }, [chatId]);

  useEffect(() => {
    if (groupId && chatId) {
      dispatch(fetchGroupMessages({ groupId, chatId }));
    }
  }, [groupId, chatId]);

  useEffect(() => {
    hasAutoScrolledRef.current = false;
  }, [chatId]);

  /* =====================================================
     SOCKET (REALTIME + ONLINE + TYPING - FIXED)
  ===================================================== */
  useEffect(() => {
    if (!token || !groupId) return;

    const socket = connectSocket(token);
    socketRef.current = socket;

    /* ================= JOIN GROUP ROOM ================= */
    socket.emit("group:join", { groupId }, (res) => {
      if (!res?.success) {
        console.warn("❌ Failed to join group room", res);
      }
    });

    /* ================= GROUP MESSAGES ================= */
    const onGroupMessage = ({ groupId: gid, message }) => {
      if (String(gid) === String(groupId)) {
        dispatch(pushIncomingMessage({ chatId, message }));
        
        // Auto-scroll after receiving message
        requestAnimationFrame(() => {
          listRef.current?.scrollToEnd({ animated: true });
        });
      }
    };

    socket.on("group:message:new", onGroupMessage);

    /* ================= GROUP TYPING ================= */
    socket.on("group:typing:start", ({ userId }) => {
      if (!userId) return;
      if (String(userId) === String(resolvedUserId)) return;

      setTypingUserIds((prev) => {
        const next = new Set(prev);
        next.add(String(userId));
        return next;
      });
    });

    socket.on("group:typing:stop", ({ userId }) => {
      if (!userId) return;

      setTypingUserIds((prev) => {
        const next = new Set(prev);
        next.delete(String(userId));
        return next;
      });
    });

    /* ================= GROUP PRESENCE ================= */
    // Initial presence check
    socket.emit("group:presence:whois", { groupId }, (res) => {
      if (res?.success) {
        const onlineIds = new Set(res.data.map(u => String(u.userId)));
        setOnlineUserIds(onlineIds);
      }
    });

    // Live presence updates
    socket.on("group:user:online", ({ userId }) => {
      setOnlineUserIds(prev => new Set(prev).add(String(userId)));
    });

    socket.on("group:user:offline", ({ userId }) => {
      setOnlineUserIds(prev => {
        const next = new Set(prev);
        next.delete(String(userId));
        return next;
      });
    });

    /* ================= CLEANUP ================= */
    return () => {
      try {
        emitTypingStop();
      } catch { }

      socket.emit("group:leave", { groupId });

      socket.off("group:message:new", onGroupMessage);
      socket.off("group:typing:start");
      socket.off("group:typing:stop");
      socket.off("group:user:online");
      socket.off("group:user:offline");

      socket.disconnect();
      socketRef.current = null;
    };
  }, [groupId, token, chatId, resolvedUserId]);

  /* =====================================================
     LEAVE GROUP HANDLING
  ===================================================== */
  const handleLeaveConfirmed = async () => {
    if (!groupId) return;

    try {
      // Gracefully leave socket room
      try {
        socketRef.current?.emit("group:leave", { groupId });
        socketRef.current?.disconnect();
      } catch { }

      await dispatch(leaveGroup(groupId)).unwrap();

      setShowLeaveModal(false);

      // Back to community
      router.replace("/community");
    } catch (err) {
      console.error("[GroupChat] ❌ Leave failed", err);
      Alert.alert(
        "Error",
        "Unable to leave the group. Please try again."
      );
    }
  };

  /* =====================================================
     SEND MESSAGE
  ===================================================== */
  const onSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !groupId) return;

    dispatch(
      sendGroupMessage({
        groupId,
        chatId,
        payload: {
          ciphertext: trimmed,
          iv: "plain-iv",
          tag: "plain-tag",
          type: "text",
          replyTo: replyTo?._id || null,
        },
      })
    );

    setText("");
    setReplyTo(null);
    emitTypingStop();
  };

  /* =====================================================
     HEADER STATUS TEXT
  ===================================================== */
  const typingNames = useMemo(() => {
    const arr = Array.from(typingUserIds);
    if (!arr.length) return [];
    return arr.slice(0, 2).map((id) => getMemberName(id));
  }, [typingUserIds, members]);

  const onlineCount = useMemo(() => Array.from(onlineUserIds).length, [onlineUserIds]);

  const headerSubtitle = useMemo(() => {
    if (typingNames.length) {
      if (typingNames.length === 1) return `${typingNames[0]} is typing…`;
      if (typingNames.length === 2) return `${typingNames[0]} & ${typingNames[1]} are typing…`;
      return `Several people are typing…`;
    }
    if (onlineCount > 0) return `${onlineCount} online • ${members.length} members`;
    return `${members.length} members`;
  }, [typingNames, onlineCount, members.length]);

  /* =====================================================
     DATE TAG COMPONENT
  ===================================================== */
  const DateTag = React.memo(function DateTag({ label }) {
    return (
      <View style={tw`my-4 items-center`}>
        <View style={tw`px-4 py-1 bg-gray-200 rounded-full`}>
          <Text style={{ fontFamily: "Poppins-Regular", fontSize: 12, color: "#374151" }}>
            {label}
          </Text>
        </View>
      </View>
    );
  });

  /* =====================================================
     LONG PRESS MENU ACTIONS
  ===================================================== */
  const openContextMenu = (msg) => {
    setContextMessage(msg);
    setContextMenuVisible(true);
  };

  const closeContextMenu = () => {
    setContextMenuVisible(false);
    setContextMessage(null);
  };

  const doReply = () => {
    if (!contextMessage) return;
    setReplyTo(contextMessage);
    closeContextMenu();
  };

  const doPin = () => {
    if (!contextMessage) return;
    togglePinMessage(contextMessage);
    closeContextMenu();
  };

  const doCopy = async () => {
    if (!contextMessage) return;
    await copyToClipboard(contextMessage?.ciphertext);
    closeContextMenu();
  };

  const doDeleteForMe = () => {
    if (!contextMessage?._id) return;
    const mid = String(contextMessage._id);
    setHiddenMessageIds((prev) => {
      const next = new Set(prev);
      next.add(mid);
      return next;
    });
    closeContextMenu();
  };

  const doDeleteForEveryone = () => {
    if (!contextMessage?._id) return;
    closeContextMenu();
    
    // Emit delete event
    try {
      socketRef.current?.emit("message:deleted", {
        chatId,
        messageId: contextMessage._id,
      });
    } catch { }
    
    Alert.alert(
      "Deleted",
      "Message deleted for everyone",
      [{ text: "OK" }]
    );
  };

  /* =====================================================
     MESSAGE ROW COMPONENT
  ===================================================== */
  const MessageRow = React.memo(function MessageRow({ item }) {
    const swipeRef = useRef(null);

    const myId = getMyId();
    const senderId = getSenderId(item);
    const isMine = myId && senderId && String(senderId) === String(myId);

    const senderName =
      item?.sender?.profile?.fullName ||
      getSenderNameFromMessage(item) ||
      getMemberName(senderId) ||
      "Member";

    const senderAvatar =
      getSenderAvatarFromMessage(item) || getMemberAvatar(senderId) || null;

    const replyPreviewText =
      item?.replyTo?.ciphertext || item?.replyTo?.text || item?.replyTo?.message || null;

    const replyPreviewSenderId =
      item?.replyTo?.sender?._id || item?.replyTo?.sender?.id || item?.replyTo?.sender || null;

    const replyPreviewSenderName =
      item?.replyTo?.sender?.profile?.fullName ||
      getMemberName(String(replyPreviewSenderId)) ||
      null;

    const onSwipeReply = () => {
      setReplyTo(item);
      swipeRef.current?.close?.();
    };

    const renderLeftActions = () => {
      return (
        <View style={tw`justify-center pl-4`}>
          <View style={tw`w-9 h-9 rounded-full bg-purple-600 items-center justify-center`}>
            <Ionicons name="return-up-forward" size={18} color="#fff" />
          </View>
        </View>
      );
    };

    const isPinned = pinnedMessageIds.has(String(item?._id));
    const reactionSummary = getReactionSummary(item);
    const receipt = getReceiptState(item, isMine);

    return (
      <Swipeable
        ref={swipeRef}
        friction={2}
        leftThreshold={40}
        renderLeftActions={renderLeftActions}
        onSwipeableLeftOpen={onSwipeReply}
      >
        <Pressable
          onLongPress={() => openContextMenu(item)}
          delayLongPress={250}
          style={({ pressed }) => [pressed ? tw`opacity-95` : null]}
        >
          <View style={[tw`mb-5 flex-row`, isMine ? tw`justify-end` : tw`justify-start`]}>
            {/* AVATAR (LEFT ONLY, NOT MINE) */}
            {!isMine && (
              <Image
                source={
                  senderAvatar
                    ? { uri: senderAvatar }
                    : require("../../assets/images/image-placeholder.png")
                }
                style={tw`w-9 h-9 rounded-full mr-3`}
              />
            )}

            {/* MESSAGE BUBBLE */}
            <View
              style={[
                tw`px-4 py-3 rounded-2xl max-w-[82%]`,
                isMine ? tw`bg-white border border-gray-200` : tw`bg-purple-600`,
              ]}
            >
              {/* PIN INDICATOR */}
              {isPinned && (
                <View style={tw`flex-row items-center mb-1`}>
                  <Ionicons
                    name="pin"
                    size={12}
                    color={isMine ? "#6B7280" : "#E9D5FF"}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      marginLeft: 4,
                      fontFamily: "Poppins-Medium",
                      color: isMine ? "#6B7280" : "#E9D5FF",
                    }}
                  >
                    Pinned
                  </Text>
                </View>
              )}

              {/* SENDER NAME (ONLY FOR RECEIVED) */}
              {!isMine && (
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 12,
                    color: "#E9D5FF",
                    marginBottom: 4,
                  }}
                >
                  {senderName}
                </Text>
              )}

              {/* REPLY PREVIEW */}
              {!!replyPreviewText && (
                <View
                  style={[
                    tw`mb-2 px-3 py-2 rounded-xl`,
                    isMine ? tw`bg-gray-50 border border-gray-200` : tw`bg-purple-500/40`,
                  ]}
                >
                  {!!replyPreviewSenderName && (
                    <Text
                      style={{
                        fontFamily: "Poppins-SemiBold",
                        fontSize: 12,
                        color: isMine ? "#6B7280" : "#E9D5FF",
                        marginBottom: 2,
                      }}
                    >
                      {replyPreviewSenderName}
                    </Text>
                  )}
                  <Text
                    numberOfLines={2}
                    style={{
                      fontFamily: "Poppins-Regular",
                      fontSize: 12,
                      color: isMine ? "#6B7280" : "#F3E8FF",
                    }}
                  >
                    {String(replyPreviewText)}
                  </Text>
                </View>
              )}

              {/* MESSAGE TEXT */}
              <Text
                style={{
                  fontFamily: "Poppins-Regular",
                  fontSize: 14,
                  lineHeight: 20,
                  color: isMine ? "#111827" : "#FFFFFF",
                }}
              >
                {item.isDeletedForEveryone ? (
                  <Text
                    style={{
                      fontFamily: "Poppins-Italic",
                      fontSize: 13,
                      color: isMine ? "#9CA3AF" : "#E9D5FF",
                    }}
                  >
                    This message was deleted
                  </Text>
                ) : (
                  String(item.ciphertext ?? "")
                )}
              </Text>

              {/* REACTIONS ROW */}
              {reactionSummary.length > 0 && (
                <View style={tw`mt-2 flex-row flex-wrap`}>
                  {reactionSummary.map((r) => (
                    <View
                      key={`${String(item._id)}-${r.emoji}`}
                      style={[
                        tw`mr-2 mb-2 px-2 py-1 rounded-full flex-row items-center`,
                        isMine ? tw`bg-gray-100 border border-gray-200` : tw`bg-purple-500/40`,
                      ]}
                    >
                      <Text style={{ fontFamily: "Poppins-Regular", fontSize: 12, color: isMine ? "#111827" : "#FFFFFF" }}>
                        {r.emoji} {r.count}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* META: TIME + RECEIPTS */}
              <View style={tw`mt-2 flex-row items-center justify-end`}>
                <Text
                  style={{
                    fontFamily: "Poppins-Regular",
                    fontSize: 11,
                    color: isMine ? "#9CA3AF" : "#E9D5FF",
                  }}
                >
                  {formatTime(item.createdAt || item.updatedAt)}
                </Text>

                {isMine && receipt.icon && (
                  <Ionicons
                    name={receipt.icon}
                    size={14}
                    color={receipt.color || "#9CA3AF"}
                    style={{ marginLeft: 6 }}
                  />
                )}
              </View>
            </View>
          </View>
        </Pressable>
      </Swipeable>
    );
  });

  /* =====================================================
     RENDER LIST ITEM
  ===================================================== */
  const renderListItem = ({ item }) => {
    if (item?.type === "date") return <DateTag label={item.label} />;
    return <MessageRow item={item} />;
  };

  /* =====================================================
     LOADING STATE
  ===================================================== */
  if (loadingDetail || !selectedChat) {
    return (
      <View style={tw`flex-1 bg-gray-50`}>
        <View
          style={{
            height: 110,
            backgroundColor: "#6A1B9A",
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        />
        <ShimmerLoader />
      </View>
    );
  }

  /* =====================================================
     MAIN UI RENDER
  ===================================================== */
  return (
    <KeyboardAvoidingView
      style={tw`flex-1 bg-gray-50`}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ================= HEADER ================= */}
      <View
        style={{
          backgroundColor: "#6A1B9A",
          paddingTop: insets.top + 18,
          paddingBottom: 22,
          paddingHorizontal: 16,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          elevation: 8,
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 12,
        }}
      >
        <View style={tw`flex-row items-center justify-between`}>
          {/* LEFT SIDE */}
          <View style={tw`flex-row items-center flex-1`}>
            {/* Back */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={tw`p-2 -ml-2`}
              hitSlop={12}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Group Avatar */}
            <View style={tw`ml-3`}>
              {group?.avatar ? (
                <Image
                  source={{ uri: group.avatar }}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    borderWidth: 2,
                    borderColor: "#FFFFFF",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: "#FFD700",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Poppins-Bold",
                      color: "#6A1B9A",
                      fontSize: 17,
                    }}
                  >
                    {group?.name?.charAt(0)?.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* Title */}
            <View style={tw`ml-3 flex-1`}>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: "Poppins-Bold",
                  fontSize: 19,
                  color: "#FFFFFF",
                }}
              >
                {group?.name}
              </Text>

              <Text
                numberOfLines={1}
                style={{
                  fontFamily: "Poppins-Regular",
                  fontSize: 13,
                  color: "#E9D5FF",
                }}
              >
                {headerSubtitle}
              </Text>
            </View>
          </View>

          {/* RIGHT MENU */}
          <View style={tw`relative`}>
            <TouchableOpacity
              onPress={() => setMenuOpen(!menuOpen)}
              style={tw`p-2`}
              hitSlop={12}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={22}
                color="#FFD700"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ================= PINNED PREVIEW ================= */}
      {pinnedMessages.length > 0 && (
        <View style={tw`bg-white border-b border-gray-200 px-4 py-2`}>
          <View style={tw`flex-row items-center`}>
            <Ionicons name="pin" size={14} color="#6B7280" />
            <Text
              style={{
                marginLeft: 8,
                fontFamily: "Poppins-SemiBold",
                fontSize: 12,
                color: "#111827",
              }}
            >
              Pinned message
            </Text>
          </View>

          <Text
            numberOfLines={1}
            style={{
              marginTop: 4,
              fontFamily: "Poppins-Regular",
              fontSize: 13,
              color: "#374151",
            }}
          >
            {String(pinnedMessages[0]?.ciphertext ?? "")}
          </Text>
        </View>
      )}

      {/* ================= MESSAGES ================= */}
      <FlatList
        ref={listRef}
        data={messagesWithDates}
        keyExtractor={(item, index) => {
          if (item.type === "date") {
            return `date-${item.label}-${index}`;
          }
          return `msg-${item._id}`;
        }}
        renderItem={renderListItem}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (!hasAutoScrolledRef.current) {
            requestAnimationFrame(() => {
              listRef.current?.scrollToEnd({ animated: false });
              hasAutoScrolledRef.current = true;
            });
          }
        }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: inputHeight + 24,
        }}
        overScrollMode="never"
        bounces={false}
      />

      {/* ================= LONG PRESS MENU ================= */}
      <Modal
        transparent
        visible={contextMenuVisible}
        animationType="fade"
        onRequestClose={closeContextMenu}
      >
        <Pressable
          style={tw`flex-1 bg-black/30 justify-center items-center px-6`}
          onPress={closeContextMenu}
        >
          <Pressable
            onPress={() => { }}
            style={tw`bg-white rounded-2xl w-full max-w-[340px] overflow-hidden border border-gray-200`}
          >
            {/* Quick reactions */}
            <View style={tw`px-4 py-3 flex-row items-center justify-between`}>
              <Text style={{ fontFamily: "Poppins-SemiBold", color: "#111827" }}>
                React
              </Text>
              <View style={tw`flex-row items-center`}>
                {["❤️", "😂", "👍", "🔥"].map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => {
                      toggleReaction(contextMessage, e);
                      closeContextMenu();
                    }}
                    style={tw`ml-3`}
                  >
                    <Text style={{ fontSize: 18 }}>{e}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={tw`h-[1px] bg-gray-200`} />

            {/* Reply */}
            <Pressable style={tw`px-4 py-3 flex-row items-center`} onPress={doReply}>
              <Ionicons name="return-up-back" size={18} color="#111827" />
              <Text style={{ marginLeft: 12, fontFamily: "Poppins-Regular", color: "#111827" }}>
                Reply
              </Text>
            </Pressable>

            {/* Pin / Unpin */}
            <Pressable style={tw`px-4 py-3 flex-row items-center`} onPress={doPin}>
              <Ionicons name="pin" size={18} color="#111827" />
              <Text style={{ marginLeft: 12, fontFamily: "Poppins-Regular", color: "#111827" }}>
                {pinnedMessageIds.has(String(contextMessage?._id))
                  ? "Unpin Message"
                  : "Pin Message"}
              </Text>
            </Pressable>

            {/* Copy */}
            <Pressable style={tw`px-4 py-3 flex-row items-center`} onPress={doCopy}>
              <Ionicons name="copy-outline" size={18} color="#111827" />
              <Text style={{ marginLeft: 12, fontFamily: "Poppins-Regular", color: "#111827" }}>
                Copy
              </Text>
            </Pressable>

            <View style={tw`h-[1px] bg-gray-200`} />

            {/* Delete for me */}
            <Pressable
              style={tw`px-4 py-3 flex-row items-center`}
              onPress={() => {
                Alert.alert("Delete", "Delete this message for you?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: doDeleteForMe },
                ]);
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
              <Text
                style={{
                  marginLeft: 12,
                  fontFamily: "Poppins-SemiBold",
                  color: "#DC2626",
                }}
              >
                Delete for me
              </Text>
            </Pressable>

            {/* Delete for everyone */}
            <Pressable
              style={tw`px-4 py-3 flex-row items-center`}
              onPress={() => {
                Alert.alert("Delete for everyone", "Delete this message for everyone?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: doDeleteForEveryone },
                ]);
              }}
            >
              <Ionicons name="trash-bin-outline" size={18} color="#DC2626" />
              <Text
                style={{
                  marginLeft: 12,
                  fontFamily: "Poppins-SemiBold",
                  color: "#DC2626",
                }}
              >
                Delete for everyone
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ================= REPLY BAR ================= */}
      {replyTo && (
        <View
          style={tw`absolute left-0 right-0 bottom-16 bg-white border-t border-gray-200 px-4 py-3 flex-row items-center`}
        >
          <View style={tw`flex-1`}>
            <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 12, color: "#6B7280" }}>
              Replying to
            </Text>
            <Text
              numberOfLines={1}
              style={{ fontFamily: "Poppins-Regular", fontSize: 13, color: "#111827" }}
            >
              {String(replyTo?.ciphertext ?? "")}
            </Text>
          </View>

          <TouchableOpacity onPress={() => setReplyTo(null)} style={tw`ml-3`}>
            <Ionicons name="close" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
      )}

      {/* ================= INPUT ================= */}
      <View
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h !== inputHeight) {
            setInputHeight(h);
          }
        }}
        style={tw`absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex-row items-center`}
      >
        <TextInput
          value={text}
          onChangeText={(v) => {
            setText(v);
            emitTypingStart();
            scheduleTypingStop();
          }}
          onFocus={() => {
            emitTypingStart();
            scheduleTypingStop();
          }}
          onBlur={() => {
            emitTypingStop();
          }}
          placeholder={replyTo ? "Reply…" : "Message group…"}
          placeholderTextColor="#9CA3AF"
          style={[
            tw`flex-1 bg-gray-100 rounded-full px-4 py-3 mr-3`,
            { fontFamily: "Poppins-Regular" },
          ]}
        />

        <TouchableOpacity onPress={onSend} style={tw`bg-purple-600 rounded-full p-3`}>
          <Ionicons name="send" size={18} color="white" />
        </TouchableOpacity>
      </View>

      {/* ================= GROUP MENU MODAL ================= */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "transparent",
          }}
          onPress={() => setMenuOpen(false)}
        >
          <Pressable
            onPress={() => { }}
            style={{
              position: "absolute",
              top: insets.top + 70,
              right: 16,
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              width: 200,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              elevation: 50,
              zIndex: 999999,
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 16,
            }}
          >
            {/* Group Info */}
            <Pressable
              style={tw`px-4 py-3`}
              onPress={() => {
                setMenuOpen(false);
                router.push({
                  pathname: "/community/group/[id]",
                  params: { id: group?._id },
                });
              }}
            >
              <Text style={{ fontFamily: "Poppins-Regular" }}>
                Group Info
              </Text>
            </Pressable>

            {/* Report */}
            <Pressable
              style={tw`px-4 py-3`}
              onPress={() => {
                setMenuOpen(false);
                router.push({
                  pathname: "/modals/report",
                  params: {
                    type: "group",
                    targetId: group?._id,
                  },
                });
              }}
            >
              <Text style={{ fontFamily: "Poppins-Regular" }}>
                Report Group
              </Text>
            </Pressable>

            <View style={tw`h-px bg-gray-200`} />

            {/* Leave Group */}
            <Pressable
              style={tw`px-4 py-3`}
              onPress={() => {
                setMenuOpen(false);
                setShowLeaveModal(true);
              }}
            >
              <Text
                style={{
                  fontFamily: "Poppins-SemiBold",
                  color: "#DC2626",
                }}
              >
                Leave Group
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ================= LEAVE CONFIRM MODAL ================= */}
      <ConfirmModal
        visible={showLeaveModal}
        danger
        title="Leave group?"
        message="You will lose access to this group and its messages."
        confirmText="Leave"
        cancelText="Cancel"
        onCancel={() => setShowLeaveModal(false)}
        onConfirm={handleLeaveConfirmed}
      />
    </KeyboardAvoidingView>
  );
}