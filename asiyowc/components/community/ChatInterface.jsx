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
  fetchChatDetail,
  sendChatMessage,
  pushIncomingMessage,
  updateMessageReactions,
  togglePinMessage,
  updateEditedMessage,
} from "../../store/slices/communitySlice";

import { connectSocket } from "../../services/socket";
import tw from "../../utils/tw";
import ShimmerLoader from "../../components/ui/ShimmerLoader";

/* =====================================================
   HELPERS (JWT = SOURCE OF TRUTH)
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

const isPopulatedUser = (p) =>
  p &&
  typeof p === "object" &&
  (p.profile?.fullName || p.fullName || p.name);

const getUserName = (u) =>
  u?.profile?.fullName || u?.fullName || u?.name || "Chat";

const getUserAvatar = (u) =>
  u?.profile?.avatar?.url ||
  u?.profile?.avatar ||
  u?.avatar?.url ||
  u?.avatar ||
  null;

const normalizeId = (v) => {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v._id) return String(v._id);
  if (v.id) return String(v.id);
  return null;
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
   DIRECT MESSAGE CHAT INTERFACE (COMPLETE WITH ALL FEATURES)
===================================================== */
export default function ChatInterface({ chatId }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const listRef = useRef(null);
  const socketRef = useRef(null);
  const typingStopTimerRef = useRef(null);
  const insets = useSafeAreaInsets();

  const { token } = useSelector((s) => s.auth);
  const { selectedChat, loadingDetail, chats } = useSelector((s) => s.community);

  const myId = getUserIdFromToken(token);

  /* ================= UI STATE ================= */
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [contextMessage, setContextMessage] = useState(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [inputHeight, setInputHeight] = useState(0);
  const hasAutoScrolledRef = useRef(false);

  /* Presence & typing */
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(false);

  /* UI-safe features */
  const [pinnedIds, setPinnedIds] = useState(new Set());
  const [reactions, setReactions] = useState({});
  const [hiddenIds, setHiddenIds] = useState(new Set());

  /* =====================================================
     FETCH CHAT
  ===================================================== */
  useEffect(() => {
    if (chatId) dispatch(fetchChatDetail(chatId));
  }, [chatId]);

  useEffect(() => {
    if (!selectedChat?._id) return;

    const pinned = new Set();

    selectedChat.messages?.forEach((m) => {
      if (m?.isPinned) pinned.add(String(m._id));
    });

    setPinnedIds(pinned);
  }, [selectedChat?._id]);

  /* =====================================================
     PARTICIPANTS (DETAIL → LIST FALLBACK)
  ===================================================== */
  const chatFromList = useMemo(
    () => (Array.isArray(chats) ? chats : []).find(c => String(c?._id) === String(chatId)),
    [chats, chatId]
  );

  const participants = useMemo(() => {
    const detail = selectedChat?.participants || [];
    if (detail.some(isPopulatedUser)) return detail;
    return chatFromList?.participants || detail;
  }, [selectedChat, chatFromList]);

  const receiver = useMemo(() => {
    return participants.find(p => normalizeId(p) !== myId) || null;
  }, [participants, myId]);

  const receiverId = normalizeId(receiver);
  const receiverName = isPopulatedUser(receiver) ? getUserName(receiver) : "Chat";
  const receiverAvatar = isPopulatedUser(receiver) ? getUserAvatar(receiver) : null;

  /* =====================================================
     SOCKET (REALTIME WITH ALL FEATURES)
  ===================================================== */
  useEffect(() => {
    if (!token || !chatId) return;

    const socket = connectSocket(token);
    socketRef.current = socket;

    /* ================= JOIN CHAT ROOM ================= */
    socket.emit("chat:join", { chatId }, (res) => {
      if (!res?.success) {
        console.warn("❌ Failed to join chat", res);
      }
    });

    /* ================= MESSAGES ================= */
    const onMessage = ({ chatId: id, message }) => {
      if (String(id) !== String(chatId)) return;

      dispatch(
        pushIncomingMessage({
          chatId: id,
          message,
        })
      );

      //AUTO SCROLL AFTER REALTIME MESSAGE
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    };

    socket.on("message:new", onMessage);

    /* ================= REACTIONS ================= */
    const onReaction = ({ chatId: id, messageId, reactions }) => {
      if (String(id) !== String(chatId)) return;

      dispatch(
        updateMessageReactions({
          messageId,
          reactions,
        })
      );
    };

    socket.on("message:reaction", onReaction);

    /* ================= DELETE ================= */
    const onDelete = ({ chatId: id, messageId }) => {
      if (String(id) !== String(chatId)) return;

      dispatch(
        updateEditedMessage({
          messageId,
          changes: {
            isDeletedForEveryone: true,
            ciphertext: "",
          },
        })
      );
    };

    socket.on("message:deleted", onDelete);

    /* ================= TYPING ================= */
    socket.on("typing:start", ({ userId }) => {
      if (String(userId) === String(myId)) return;
      setTyping(true);
    });

    socket.on("typing:stop", ({ userId }) => {
      if (String(userId) === String(myId)) return;
      setTyping(false);
    });

    /* ================= PRESENCE ================= */
    // Initial presence check
    if (receiverId) {
      socket.emit(
        "presence:whois",
        { userIds: [receiverId] },
        (res) => {
          if (res?.success) {
            const found = res.data.find(
              (u) => String(u.userId) === String(receiverId)
            );
            setOnline(!!found?.online);
          }
        }
      );
    }

    // Live updates
    socket.on("user:online", ({ userId }) => {
      if (String(userId) === String(receiverId)) {
        setOnline(true);
      }
    });

    socket.on("user:offline", ({ userId }) => {
      if (String(userId) === String(receiverId)) {
        setOnline(false);
      }
    });

    /* ================= CLEANUP ================= */
    return () => {
      emitTypingStop();
      socket.emit("chat:leave", { chatId });

      socket.off("message:new", onMessage);
      socket.off("message:reaction", onReaction);
      socket.off("message:deleted", onDelete);
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("user:online");
      socket.off("user:offline");

      socket.disconnect();
      socketRef.current = null;
    };

  }, [chatId, token, receiverId, myId]);


  /* =====================================================
     TYPING EMITS
  ===================================================== */
  const emitTypingStart = () => {
    if (!socketRef.current || !chatId) return;
    socketRef.current.emit("typing:start", { chatId });
  };

  const emitTypingStop = () => {
    if (!socketRef.current || !chatId) return;
    socketRef.current.emit("typing:stop", { chatId });
  };


  const scheduleTypingStop = () => {
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => {
      emitTypingStop();
    }, 900);
  };

  /* =====================================================
     SEND MESSAGE
  ===================================================== */
  const onSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    dispatch(
      sendChatMessage({
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
    setTyping(false);
    emitTypingStop();
  };

  /* =====================================================
     PIN / UNPIN
  ===================================================== */
  const togglePinLocal = (message) => {
    if (!message?._id) return;

    // 1️⃣ Update local UI state
    setPinnedIds((prev) => {
      const next = new Set(prev);
      const id = String(message._id);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });

    // 2️⃣ Update Redux (global state)
    dispatch(
      togglePinMessage({
        chatId,
        messageId: message._id,
      })
    );

    // 3️⃣ Emit realtime event
    try {
      socketRef.current?.emit("message:pin", {
        chatId,
        messageId: message._id,
      });
    } catch { }
  };

  const pinnedMessages = useMemo(() => {
    const messages = selectedChat?.messages || [];
    if (!pinnedIds.size) return [];
    return messages.filter((m) => pinnedIds.has(String(m._id)));
  }, [selectedChat?.messages, pinnedIds]);

  /* =====================================================
     REACTIONS
  ===================================================== */
  const toggleReaction = (message, emoji) => {
    if (!message?._id) return;
    if (!socketRef.current) return;

    socketRef.current.emit("message:reaction", {
      chatId,
      messageId: message._id,
      emoji,
    });
  };


  const getReactionSummary = (message) => {
    if (!Array.isArray(message?.reactions)) return [];

    const map = {};

    message.reactions.forEach((r) => {
      if (!map[r.emoji]) map[r.emoji] = new Set();
      map[r.emoji].add(String(r.user?._id || r.user));
    });

    return Object.entries(map).map(([emoji, users]) => ({
      emoji,
      count: users.size,
    }));
  };

  /* =====================================================
     READ RECEIPTS (UI SAFE)
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
     DATE GROUPING WITH SEPARATORS
  ===================================================== */
  const uniqueMessages = useMemo(() => {
    const map = new Map();
    (selectedChat?.messages || []).forEach((m) => {
      if (m?._id) {
        map.set(String(m._id), m);
      }
    });
    return Array.from(map.values());
  }, [selectedChat?.messages]);


  const messagesWithDates = useMemo(() => {
    const visibleMessages = uniqueMessages.filter(
      (m) => !hiddenIds.has(String(m._id))
    );

    const sortedMessages = [...visibleMessages].sort(
      (a, b) =>
        new Date(a.createdAt || a.updatedAt) -
        new Date(b.createdAt || b.updatedAt)
    );

    const result = [];
    let lastDate = null;

    sortedMessages.forEach((msg) => {
      const msgDate = new Date(msg.createdAt || msg.updatedAt);

      if (!lastDate || !isSameDay(msgDate, lastDate)) {
        result.push({
          _id: `date-${msgDate.toISOString().slice(0, 10)}`, // day-level
          type: "date",
          label: formatDateLabel(msgDate),
        });
        lastDate = msgDate;
      }

      result.push({ ...msg, type: "message" });
    });

    return result;
  }, [uniqueMessages, hiddenIds]);


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
    togglePinLocal(contextMessage);
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
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(mid);
      return next;
    });
    closeContextMenu();
  };

  const doDeleteForEveryone = () => {
    closeContextMenu();
    socketRef.current?.emit("message:deleted", {
      chatId,
      messageId: contextMessage._id,
    });
    // dispatch(
    //   softDeleteMessage({
    //     chatId,
    //     messageId: contextMessage._id,
    //     mode: "everyone",
    //   })
    // );
    closeContextMenu();

  };

  /* =====================================================
     MESSAGE ROW WITH ALL FEATURES
  ===================================================== */
  const MessageRow = React.memo(function MessageRow({ item }) {
    const swipeRef = useRef(null);

    const senderId = normalizeId(item.sender);
    const isMine = senderId === myId;

    const replied =
      typeof item.replyTo === "object"
        ? item.replyTo
        : selectedChat?.messages?.find(
          m => String(m._id) === String(item.replyTo)
        );

    const replyPreviewText = replied?.ciphertext || null;

    const replyPreviewSenderId = normalizeId(item?.replyTo?.sender);

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

    const isPinned = pinnedIds.has(String(item?._id));
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
            {!isMine && receiverAvatar && (
              <Image
                source={
                  receiverAvatar
                    ? { uri: receiverAvatar }
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

              {/* REPLY PREVIEW */}
              {!!replyPreviewText && (
                <View
                  style={[
                    tw`mb-2 px-3 py-2 rounded-xl`,
                    isMine ? tw`bg-gray-50 border border-gray-200` : tw`bg-purple-500/40`,
                  ]}
                >
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
                  <Text
                    style={{
                      fontFamily: "Poppins-Regular",
                      fontSize: 14,
                      lineHeight: 20,
                      color: isMine ? "#111827" : "#FFFFFF",
                    }}
                  >
                    {String(item.ciphertext)}
                  </Text>
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
     LIST RENDERER
  ===================================================== */
  const renderListItem = ({ item }) => {
    if (item?.type === "date") return <DateTag label={item.label} />;
    return <MessageRow item={item} />;
  };

  /* =====================================================
     LOADING STATE
  ===================================================== */
  useEffect(() => {
    hasAutoScrolledRef.current = false;
  }, [chatId]);

  if (loadingDetail || !selectedChat) {
    return (
      <View style={tw`flex-1 bg-gray-50`}>
        {/* Header shimmer placeholder */}
        <View
          style={{
            height: 110,
            backgroundColor: "#6A1B9A",
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        />

        {/* Chat bubbles shimmer */}
        <ShimmerLoader />
      </View>
    );
  }

  const headerSubtitle = typing ? "typing…" : online ? "online" : "offline";

  /* =====================================================
     UI
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

            {/* Receiver Avatar */}
            <View style={tw`ml-3`}>
              {receiverAvatar ? (
                <Image
                  source={{ uri: receiverAvatar }}
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
                    {receiverName?.charAt(0)?.toUpperCase()}
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
                {receiverName}
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
          if (inputHeight > 0 && !hasAutoScrolledRef.current) {
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
            {/* Quick reactions row */}
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
                {pinnedIds.has(String(contextMessage?._id))
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
          placeholder={replyTo ? "Reply…" : "Message…"}
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
    </KeyboardAvoidingView>
  );
}