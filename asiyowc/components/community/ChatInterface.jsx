import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { Swipeable } from "react-native-gesture-handler";
import { decode as atob } from "base-64";
import ConfirmModal from "./ConfirmModal";

import {
  fetchChatDetail,
  sendChatMessage,
  pushIncomingMessage,
  updateMessageReactions,
  updatePinnedMessage,
  updateEditedMessage,
  deleteMessageForMe,
  deleteMessageForEveryone,
  updateMessageReceipt,
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
  const readEmittedRef = useRef(new Set()); // Track already read messages
  const insets = useSafeAreaInsets();
  const keyboardHeightRef = useRef(0);
  const readQueueRef = useRef(new Set());
  const readFlushTimerRef = useRef(null);

  const { token } = useSelector((s) => s.auth);
  const { selectedChat, loadingDetail, chats } = useSelector((s) => s.community);

  const myId = getUserIdFromToken(token);

  /* ================= VIEWABILITY CONFIG ================= */
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60, // WhatsApp-like behavior
    minimumViewTime: 300, // Add minimum view time for stability
  }).current;

  /* ================= UI STATE ================= */
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [contextMessage, setContextMessage] = useState(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [inputHeight, setInputHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const hasAutoScrolledRef = useRef(false);

  /* Presence & typing */
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(false);

  /* ================= DELETE CONFIRMATION MODALS ================= */
  const [confirmDeleteMeVisible, setConfirmDeleteMeVisible] = useState(false);
  const [confirmDeleteEveryoneVisible, setConfirmDeleteEveryoneVisible] = useState(false);

  /* ================= DELETE OPTIONS MODAL ================= */
  const [deleteOptionsVisible, setDeleteOptionsVisible] = useState(false);

  /* ================= REACTION MODAL ================= */
  const [reactionModalMessageId, setReactionModalMessageId] = useState(null);

  /* =====================================================
     VIEWABILITY HANDLER FOR READ RECEIPTS
  ===================================================== */
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (!socketRef.current || !chatId || !myId) return;

    viewableItems.forEach(({ item }) => {
      // FIX #1: Guard against non-message items (date separators)
      if (
        !item ||
        item.type !== "message" ||
        !item._id || // ← ADDED: Protect against items without _id
        item.isDeletedForEveryone ||
        (Array.isArray(item.deletedFor) &&
          item.deletedFor.map(String).includes(String(myId)))
      ) {
        return;
      }

      const isMine = String(normalizeId(item.sender)) === String(myId);
      if (isMine) return;

      const messageId = String(item._id);
      const alreadyRead = Array.isArray(item.readBy) &&
        item.readBy.some(r => String(r.user || r) === String(myId));

      if (alreadyRead) {
        readEmittedRef.current.add(messageId);
        return;
      }

      if (readEmittedRef.current.has(messageId)) return;

      // 🧠 Queue instead of emit
      readQueueRef.current.add(messageId);
      readEmittedRef.current.add(messageId);
    });

    scheduleReadFlush();
  }).current;

  // FIX #2: Add momentum scroll end handler for instant flush
  const onMomentumScrollEnd = useCallback(() => {
    flushReadQueue();
  }, []);

  const scheduleReadFlush = () => {
    if (readFlushTimerRef.current) return;

    readFlushTimerRef.current = setTimeout(() => {
      flushReadQueue();
    }, 500); // WhatsApp-like delay
  };

  const flushReadQueue = () => {
    if (!socketRef.current || !socketRef.current.connected || !chatId) return;

    const messageIds = Array.from(readQueueRef.current);
    if (messageIds.length === 0) {
      if (readFlushTimerRef.current) {
        clearTimeout(readFlushTimerRef.current);
        readFlushTimerRef.current = null;
      }
      return;
    }

    socketRef.current.emit("message:read:batch", {
      chatId,
      messageIds,
    });

    readQueueRef.current.clear();
    if (readFlushTimerRef.current) {
      clearTimeout(readFlushTimerRef.current);
      readFlushTimerRef.current = null;
    }
  };

  /* =====================================================
     FETCH CHAT
  ===================================================== */
  useEffect(() => {
    if (chatId) dispatch(fetchChatDetail(chatId));
  }, [chatId]);

  /* =====================================================
     CLEAN UP READ EMITTED REF WHEN CHAT CHANGES
  ===================================================== */
  useEffect(() => {
    readEmittedRef.current.clear();

    // Also clear when component unmounts
    return () => {
      readEmittedRef.current.clear();
    };
  }, [chatId]);

  useEffect(() => {
    return () => {
      // Flush pending reads before unmount
      flushReadQueue();
    };
  }, []);

  /* =====================================================
     SYNC WITH ALREADY READ MESSAGES ON MOUNT
  ===================================================== */
  useEffect(() => {
    if (!selectedChat?.messages || !myId) return;

    // Pre-populate readEmittedRef with already read messages
    selectedChat.messages.forEach((msg) => {
      const messageId = String(msg._id);
      const isMine = String(normalizeId(msg.sender)) === String(myId);

      if (!isMine && msg.readBy?.some(id => String(id) === String(myId))) {
        readEmittedRef.current.add(messageId);
      }
    });
  }, [selectedChat?.messages, myId]);

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
     DELETE HANDLERS
  ===================================================== */
  const openDeleteOptions = () => {
    closeContextMenu();
    requestAnimationFrame(() => {
      setDeleteOptionsVisible(true);
    });
  };

  const requestDeleteForMe = () => {
    setDeleteOptionsVisible(false);
    requestAnimationFrame(() => {
      setConfirmDeleteMeVisible(true);
    });
  };

  const requestDeleteForEveryone = () => {
    setDeleteOptionsVisible(false);
    requestAnimationFrame(() => {
      setConfirmDeleteEveryoneVisible(true);
    });
  };

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

      // AUTO SCROLL TO BOTTOM FOR NEW MESSAGES (WHATSAPP STYLE)
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
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

    socket.on("message:reaction:update", ({ chatId: id, message }) => {
      if (String(id) !== String(chatId)) return;

      dispatch(
        updateMessageReactions({
          chatId: id,
          message,
        })
      );
    });

    const onPinUpdate = ({ chatId: id, pinnedMessage }) => {
      if (String(id) !== String(chatId)) return;

      dispatch(
        updatePinnedMessage({
          chatId: id,
          pinnedMessage,
        })
      );
    };

    socket.on("message:pin:update", onPinUpdate);

    /* ================= DELETE ================= */
    const onDelete = ({ chatId: id, messageId }) => {
      if (String(id) !== String(chatId)) return;

      // dispatch(
      //   deleteMessageForEveryone({
      //     messageId,
      //     message: {
      //       isDeletedForEveryone: true,
      //       ciphertext: "",
      //     },
      //   })
      // );
    };

    socket.on("message:delete:everyone:update", ({ chatId: id, messageId }) => {
      console.log("📡 DELETE FOR EVERYONE UPDATE RECEIVED", {
        chatId: id,
        messageId,
      });

      if (String(id) !== String(chatId)) return;

      dispatch(
        deleteMessageForEveryone({
          messageId: String(messageId),
        })
      );
    });

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

    // FIX #3: Add proper cleanup for batch read listener
    const handleBatchRead = ({ chatId: id, messageIds, userId }) => {
      if (String(id) !== String(chatId)) return;

      messageIds.forEach((messageId) => {
        dispatch(
          updateMessageReceipt({
            messageId,
            userId,
          })
        );
      });
    };

    socket.on("message:read:batch", handleBatchRead);

    /* ================= CLEANUP ================= */
    return () => {
      emitTypingStop();
      socket.emit("chat:leave", { chatId });

      socket.off("message:new", onMessage);
      socket.off("message:reaction:update", onReaction);
      socket.off("message:deleted", onDelete);
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("user:online");
      socket.off("user:offline");
      socket.off("message:pin:update", onPinUpdate);
      socket.off("message:reaction:update");
      // FIX #3: Remove batch read listener
      socket.off("message:read:batch", handleBatchRead); // ← ADDED

      socket.disconnect();
      socketRef.current = null;
      readQueueRef.current.clear();
      readFlushTimerRef.current && clearTimeout(readFlushTimerRef.current);
      readFlushTimerRef.current = null;
    };
  }, [chatId, token, receiverId, myId]);

  /* =====================================================
     KEYBOARD HANDLING
  ===================================================== */
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardHeightRef.current = e.endCoordinates.height;
      setKeyboardVisible(true);
      // Scroll to bottom when keyboard appears
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      keyboardHeightRef.current = 0;
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
  const pinnedMessage = useMemo(() => {
    if (!selectedChat?.pinnedMessage) return null;
    return selectedChat.messages?.find(
      (m) => String(m._id) === String(selectedChat.pinnedMessage)
    );
  }, [selectedChat?.pinnedMessage, selectedChat?.messages]);

  /* =====================================================
     REACTIONS
  ===================================================== */
  const toggleReaction = (message, emoji = null) => {
    if (!message?._id || !socketRef.current) return;

    socketRef.current.emit("message:reaction", {
      chatId,
      messageId: message._id,
      emoji, // null = remove
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

  // NEW: Get total reaction count
  const getTotalReactionCount = (message) => {
    if (!Array.isArray(message?.reactions)) return 0;
    const uniqueUsers = new Set(message.reactions.map(r => String(r.user?._id || r.user)));
    return uniqueUsers.size;
  };

  const reactionModalMessage = useMemo(() => {
    if (!reactionModalMessageId) return null;
    return selectedChat?.messages?.find(
      (m) => String(m._id) === String(reactionModalMessageId)
    );
  }, [reactionModalMessageId, selectedChat?.messages]);

  const openReactionModal = (message) => {
    if (!message?._id || !message?.reactions?.length) return;
    setReactionModalMessageId(String(message._id));
  };

  const closeReactionModal = () => {
    setReactionModalMessageId(null);
  };

  /* =====================================================
     READ RECEIPTS (UI SAFE)
  ===================================================== */
  const getReceiptState = (message, isMine) => {
    if (!isMine) return { icon: null, color: null };

    const readBy = Array.isArray(message?.readBy)
      ? message.readBy
      : [];

    const isRead = readBy.some(
      (r) => String(r.user) !== String(myId)
    );

    if (isRead) {
      return { icon: "checkmark-done", color: "#2563EB" }; // 🔵 blue
    }

    return { icon: "checkmark-done", color: "#9CA3AF" }; // ⚪ gray
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
    // Filter messages based on deletedForMe state
    const visibleMessages = uniqueMessages;

    // REVERSE SORT for WhatsApp-style (latest at bottom)
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
  }, [uniqueMessages, myId]);

  /* =====================================================
     LONG PRESS MENU ACTIONS
  ===================================================== */
  const openContextMenu = (msg) => {
    setContextMessage(msg);
    setContextMenuVisible(true);
  };

  const closeContextMenu = () => {
    setContextMenuVisible(false);
  };

  const doReply = () => {
    if (!contextMessage) return;
    setReplyTo(contextMessage);
    closeContextMenu();
  };

  const doPin = () => {
    if (!contextMessage?._id || !socketRef.current) return;

    socketRef.current.emit("message:pin", {
      chatId,
      messageId: contextMessage._id,
    });

    closeContextMenu();
  };

  const doCopy = async () => {
    if (!contextMessage) return;
    await copyToClipboard(contextMessage?.ciphertext);
    closeContextMenu();
  };

  /* =====================================================
     MESSAGE ROW WITH ALL FEATURES
  ===================================================== */
  const MessageRow = React.memo(function MessageRow({ item, myId }) {
    const swipeRef = useRef(null);

    const isMine = String(normalizeId(item.sender)) === String(myId);

    /* ================= DELETE STATES ================= */
    const deletedForEveryone = item.isDeletedForEveryone === true;

    const deletedForMe =
      !deletedForEveryone &&
      Array.isArray(item.deletedFor) &&
      item.deletedFor.map(String).includes(String(myId));

    // Show deleted bubble
    const showDeletedBubble = deletedForEveryone || deletedForMe;

    // Correct message text
    const deletedText = deletedForEveryone
      ? "This message was deleted"
      : "This message was deleted from me";

    /* ================================================= */

    const replied =
      typeof item.replyTo === "object"
        ? item.replyTo
        : selectedChat?.messages?.find(
          (m) => String(m._id) === String(item.replyTo)
        );

    const replyPreviewText = replied?.ciphertext || null;

    const onSwipeReply = () => {
      if (showDeletedBubble) return; // prevent reply on deleted
      setReplyTo(item);
      swipeRef.current?.close?.();
    };

    const renderLeftActions = () => (
      <View style={tw`justify-center pl-4`}>
        <View style={tw`w-9 h-9 rounded-full bg-purple-600 items-center justify-center`}>
          <Ionicons name="return-up-forward" size={18} color="#fff" />
        </View>
      </View>
    );

    const isPinned = String(item._id) === String(selectedChat?.pinnedMessage);
    const reactionSummary = getReactionSummary(item);
    const totalReactions = getTotalReactionCount(item);
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
          onLongPress={() => {
            if (!showDeletedBubble) openContextMenu(item);
          }}
          delayLongPress={250}
        >
          <View
            style={[
              tw`mb-5 flex-row`,
              isMine ? tw`justify-end` : tw`justify-start`,
            ]}
          >
            {!isMine && receiverAvatar && (
              <Image
                source={{ uri: receiverAvatar }}
                style={tw`w-9 h-9 rounded-full mr-3`}
              />
            )}

            <View
              style={[
                tw`px-4 py-3 rounded-2xl max-w-[82%]`,
                isMine
                  ? tw`bg-white border border-gray-200`
                  : tw`bg-purple-600`,
              ]}
            >
              {/* PIN */}
              {isPinned && !showDeletedBubble && (
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
              {!!replyPreviewText && !showDeletedBubble && (
                <View
                  style={[
                    tw`mb-2 px-3 py-2 rounded-xl`,
                    isMine
                      ? tw`bg-gray-50 border border-gray-200`
                      : tw`bg-purple-500/40`,
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
                    {replyPreviewText}
                  </Text>
                </View>
              )}

              {/* MESSAGE BODY */}
              {showDeletedBubble ? (
                <Text
                  style={{
                    fontFamily: "Poppins-Italic",
                    fontSize: 13,
                    color: isMine ? "#9CA3AF" : "#E9D5FF",
                  }}
                >
                  {deletedText}
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
                  {item.ciphertext}
                </Text>
              )}

              {/* REACTIONS */}
              {!showDeletedBubble && reactionSummary.length > 0 && (
                <View style={tw`mt-2 flex-row items-center justify-end`}>
                  <Pressable
                    onPress={() => openReactionModal(item)}
                    style={[
                      tw`flex-row items-center px-2 py-1 rounded-full`,
                      isMine
                        ? tw`bg-white border border-gray-300`
                        : tw`bg-purple-500/80`,
                      { marginLeft: "auto" },
                    ]}
                  >
                    <View style={tw`flex-row items-center mr-1`}>
                      {reactionSummary.slice(0, 3).map((r, index) => (
                        <View
                          key={`${item._id}-${r.emoji}-${index}`}
                          style={[
                            tw`w-5 h-5 rounded-full items-center justify-center`,
                            isMine
                              ? tw`bg-gray-100`
                              : tw`bg-purple-400`,
                            { marginLeft: index > 0 ? -6 : 0 },
                          ]}
                        >
                          <Text style={{ fontSize: 10 }}>{r.emoji}</Text>
                        </View>
                      ))}
                    </View>

                    <Text
                      style={{
                        fontFamily: "Poppins-Medium",
                        fontSize: 11,
                        color: isMine ? "#111827" : "#FFFFFF",
                        marginLeft: 4,
                      }}
                    >
                      {totalReactions}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* META */}
              <View style={tw`mt-2 flex-row items-center justify-end`}>
                <Text
                  style={{
                    fontFamily: "Poppins-Regular",
                    fontSize: 11,
                    color: isMine ? "#9CA3AF" : "#E9D5FF",
                  }}
                >
                  {formatTime(item.createdAt)}
                </Text>

                {isMine && receipt.icon && !showDeletedBubble && (
                  <Ionicons
                    name={receipt.icon}
                    size={14}
                    color={receipt.color}
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
    return <MessageRow item={item} myId={myId} />;
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
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
      {pinnedMessage && (
        <View style={tw`bg-gradient-to-r from-purple-50 to-white border-b border-gray-100 px-4 py-3 shadow-sm`}>
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center flex-1`}>
              {/* PIN ICON */}
              <View style={tw`bg-gradient-to-br from-purple-500 to-purple-600 w-8 h-8 rounded-full items-center justify-center mr-3`}>
                <Ionicons name="pin" size={16} color="#FFFFFF" />
              </View>

              {/* MESSAGE CONTENT */}
              <View style={tw`flex-1`}>
                <Text
                  style={{
                    fontFamily: "Poppins-SemiBold",
                    fontSize: 12,
                    color: "#6B7280",
                    letterSpacing: 0.5,
                  }}
                >
                  Pinned message
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: 2,
                    fontFamily: "Poppins-Medium",
                    fontSize: 14,
                    color: "#111827",
                  }}
                >
                  {String(pinnedMessage.ciphertext || "Pinned message")}
                </Text>
              </View>
            </View>

            {/* UNPIN BUTTON */}
            <Pressable
              onPress={() =>
                socketRef.current?.emit("message:pin", {
                  chatId,
                  messageId: pinnedMessage._id,
                })
              }
              style={tw`ml-3 w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200`}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* SENDER INFO (OPTIONAL) */}
          <View style={tw`flex-row items-center mt-2 ml-11`}>
            {pinnedMessage.sender && (
              <>
                <Image
                  source={
                    getUserAvatar(pinnedMessage.sender)
                      ? { uri: getUserAvatar(pinnedMessage.sender) }
                      : require("../../assets/images/image-placeholder.png")
                  }
                  style={tw`w-5 h-5 rounded-full mr-2`}
                />
                <Text
                  style={{
                    fontFamily: "Poppins-Regular",
                    fontSize: 11,
                    color: "#9CA3AF",
                  }}
                >
                  {getUserName(pinnedMessage.sender)}
                </Text>
                <Text
                  style={{
                    fontFamily: "Poppins-Regular",
                    fontSize: 11,
                    color: "#9CA3AF",
                    marginLeft: 8,
                  }}
                >
                  • {formatTime(pinnedMessage.createdAt)}
                </Text>
              </>
            )}
          </View>
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
        // Viewability props for read receipts
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        // FIX #2: Add momentum scroll end handler
        onMomentumScrollEnd={onMomentumScrollEnd}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (!hasAutoScrolledRef.current) {
            requestAnimationFrame(() => {
              listRef.current?.scrollToEnd({ animated: false });
              hasAutoScrolledRef.current = true;
            });
          }
        }}
        onLayout={() => {
          // Scroll to bottom on initial layout
          setTimeout(() => {
            listRef.current?.scrollToEnd({ animated: false });
            hasAutoScrolledRef.current = true;
          }, 100);
        }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: keyboardVisible ? keyboardHeightRef.current + inputHeight + 20 : inputHeight + 20,
        }}
        overScrollMode="never"
        bounces={false}
        inverted={false} // Keep false for WhatsApp-style (latest at bottom)
      />

      {/* ================= DELETE FOR ME MODAL ================= */}
      <ConfirmModal
        visible={confirmDeleteMeVisible}
        title="Delete message?"
        message="This message will be deleted only for you."
        confirmText="Delete"
        destructive
        onCancel={() => {
          setConfirmDeleteMeVisible(false);
        }}
        onConfirm={() => {
          if (!contextMessage) return;

          // ✅ NEW: Dispatch Redux action
          dispatch(
            deleteMessageForMe({
              messageId: contextMessage._id,
              userId: myId,
            })
          );

          // ✅ OPTIONAL: notify backend
          socketRef.current?.emit("message:delete:me", {
            chatId,
            messageId: contextMessage._id,
          });

          setConfirmDeleteMeVisible(false);
          setContextMessage(null);
        }}
      />

      {/* ================= DELETE FOR EVERYONE MODAL ================= */}
      <ConfirmModal
        visible={confirmDeleteEveryoneVisible}
        title="Delete for everyone?"
        message="This message will be deleted for everyone."
        confirmText="Delete"
        destructive
        onCancel={() => {
          setConfirmDeleteEveryoneVisible(false);
        }}
        onConfirm={() => {
          if (!contextMessage) return;

          // 🧠 LOG (optional – keep while testing)
          console.log("🗑️ DELETE FOR EVERYONE (FRONTEND)", {
            chatId,
            messageId: String(contextMessage._id),
            myId,
            senderId: String(normalizeId(contextMessage.sender)),
            isMine:
              String(normalizeId(contextMessage.sender)) === String(myId),
          });

          // 1️⃣ Optimistic UI update (instant bubble change)
          dispatch(
            deleteMessageForEveryone({
              messageId: String(contextMessage._id),
            })
          );

          // 2️⃣ Tell backend to persist + broadcast
          socketRef.current?.emit(
            "message:delete:everyone",
            {
              chatId,
              messageId: contextMessage._id,
            },
            (res) => {
              console.log("🧾 DELETE FOR EVERYONE RESPONSE", res);

              if (!res?.success) {
                console.warn("❌ Delete for everyone failed:", res?.message);
              }

              // 3️⃣ 🔥 Clear state ONLY after server responds
              setConfirmDeleteEveryoneVisible(false);
              setContextMessage(null);
            }
          );
        }}
      />

      {/* ================= DELETE OPTIONS MODAL ================= */}
      <Modal
        transparent
        visible={deleteOptionsVisible}
        animationType="fade"
        onRequestClose={() => setDeleteOptionsVisible(false)}
      >
        <Pressable
          style={tw`flex-1 bg-black/30 justify-center items-center px-6`}
          onPress={() => setDeleteOptionsVisible(false)}
        >
          <Pressable
            onPress={() => { }}
            style={tw`bg-white rounded-2xl w-full max-w-[340px] overflow-hidden border border-gray-200`}
          >
            {/* Header */}
            <View style={tw`px-4 py-3 border-b border-gray-200`}>
              <Text style={{
                fontFamily: "Poppins-SemiBold",
                fontSize: 16,
                color: "#111827"
              }}>
                Delete Message
              </Text>
              <Text style={{
                fontFamily: "Poppins-Regular",
                fontSize: 13,
                color: "#6B7280",
                marginTop: 4
              }}>
                Choose how you want to delete this message
              </Text>
            </View>

            {/* Delete for me option */}
            <Pressable
              style={tw`px-4 py-3 flex-row items-center border-b border-gray-100`}
              onPress={requestDeleteForMe}
            >
              <Ionicons name="person-outline" size={18} color="#DC2626" />
              <View style={tw`ml-3 flex-1`}>
                <Text style={{
                  fontFamily: "Poppins-SemiBold",
                  fontSize: 14,
                  color: "#DC2626"
                }}>
                  Delete for me
                </Text>
                <Text style={{
                  fontFamily: "Poppins-Regular",
                  fontSize: 12,
                  color: "#9CA3AF",
                  marginTop: 2
                }}>
                  Remove this message only from your chat
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>

            {/* Delete for everyone option */}
            <Pressable
              style={tw`px-4 py-3 flex-row items-center`}
              onPress={requestDeleteForEveryone}
            >
              <Ionicons name="people-outline" size={18} color="#DC2626" />
              <View style={tw`ml-3 flex-1`}>
                <Text style={{
                  fontFamily: "Poppins-SemiBold",
                  fontSize: 14,
                  color: "#DC2626"
                }}>
                  Delete for everyone
                </Text>
                <Text style={{
                  fontFamily: "Poppins-Regular",
                  fontSize: 12,
                  color: "#9CA3AF",
                  marginTop: 2
                }}>
                  Remove this message for all participants
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
                {String(contextMessage?._id) === String(selectedChat?.pinnedMessage)
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

            {/* Delete option - ONLY SHOW FOR USER'S OWN MESSAGES */}
            {String(normalizeId(contextMessage?.sender)) === String(myId) && (
              <Pressable
                style={tw`px-4 py-3 flex-row items-center`}
                onPress={() => {
                  if (!contextMessage) return;
                  openDeleteOptions();
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
                  Delete
                </Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ================= REACTION DETAILS MODAL - ENHANCED ================= */}
      <Modal
        visible={!!reactionModalMessage}
        transparent
        animationType="slide"
        onRequestClose={closeReactionModal}
      >
        <View style={tw`flex-1 bg-black/40`}>
          <Pressable
            style={tw`flex-1`}
            onPress={closeReactionModal}
          />

          <View style={[
            tw`bg-white rounded-t-3xl pt-6 px-4`,
            { maxHeight: '70%' }
          ]}>
            {/* Header */}
            <View style={tw`flex-row items-center justify-between mb-6`}>
              <Text
                style={{
                  fontFamily: "Poppins-Bold",
                  fontSize: 20,
                  color: "#111827",
                }}
              >
                Reactions
              </Text>
              <TouchableOpacity onPress={closeReactionModal}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Reaction Categories */}
            <FlatList
              data={reactionModalMessage?.reactions || []}
              keyExtractor={(item, index) => `reaction-${index}`}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const uid = normalizeId(item.user);
                const isMine = uid === myId;

                return (
                  <Pressable
                    onPress={() => {
                      if (isMine) {
                        toggleReaction(reactionModalMessage, null);
                        closeReactionModal();
                      }
                    }}
                    style={tw`flex-row items-center justify-between py-3 border-b border-gray-100`}
                  >
                    <View style={tw`flex-row items-center flex-1`}>
                      <Text style={tw`text-2xl mr-4`}>
                        {item.emoji}
                      </Text>

                      <View style={tw`flex-row items-center flex-1`}>
                        <Image
                          source={
                            getUserAvatar(item.user)
                              ? { uri: getUserAvatar(item.user) }
                              : require("../../assets/images/image-placeholder.png")
                          }
                          style={tw`w-12 h-12 rounded-full mr-4 bg-gray-200`}
                        />

                        <View style={tw`flex-1`}>
                          <Text
                            style={{
                              fontFamily: "Poppins-SemiBold",
                              fontSize: 16,
                              color: "#111827",
                            }}
                          >
                            {getUserName(item.user)}
                          </Text>

                          {!!item.createdAt && (
                            <Text
                              style={{
                                fontFamily: "Poppins-Regular",
                                fontSize: 13,
                                color: "#6B7280",
                                marginTop: 2,
                              }}
                            >
                              {new Date(item.createdAt).toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>

                    {isMine && (
                      <TouchableOpacity
                        onPress={() => {
                          toggleReaction(reactionModalMessage, null);
                          closeReactionModal();
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Poppins-Medium",
                            fontSize: 14,
                            color: "#DC2626",
                          }}
                        >
                          Remove
                        </Text>
                      </TouchableOpacity>
                    )}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={tw`py-8 items-center`}>
                  <Text
                    style={{
                      fontFamily: "Poppins-Regular",
                      fontSize: 16,
                      color: "#6B7280",
                    }}
                  >
                    No reactions yet
                  </Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            />
          </View>
        </View>
      </Modal>

      {/* ================= REPLY BAR ================= */}
      {replyTo && (
        <View
          style={[
            tw`absolute left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex-row items-center`,
            {
              bottom: keyboardVisible
                ? keyboardHeightRef.current + inputHeight
                : inputHeight,
            },
          ]}
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
        style={[
          tw`bg-white border-t border-gray-200 px-4 py-3 flex-row items-center`,
          {
            paddingBottom: insets.bottom > 0 ? insets.bottom : 12
          }
        ]}
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