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
  Alert,
  Keyboard,
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
  updateMessageReactions,
  updatePinnedMessage,
  updateEditedMessage,
  pushIncomingMessage,
  deleteMessageForMe,
  deleteMessageForEveryone,
  leaveGroup,
  updateMessageReceipt,
} from "../../store/slices/communitySlice";
import ConfirmModal from "../../components/community/ConfirmModal";

import { connectSocket } from "../../services/socket";
import tw from "../../utils/tw";
import ShimmerLoader from "../../components/ui/ShimmerLoader";

/* =====================================================
   GROUP CHAT INTERFACE (COMPLETE WITH ALL FEATURES)
===================================================== */

export default function GroupChatInterface({ chatId }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const listRef = useRef(null);
  const socketRef = useRef(null);
  const typingStopTimerRef = useRef(null);
  const readEmittedRef = useRef(new Set());
  const readQueueRef = useRef(new Set());
  const readFlushTimerRef = useRef(null);
  const hasAutoScrolledRef = useRef(false);
  const currentChatId = chatId;

  const insets = useSafeAreaInsets();
  const keyboardHeightRef = useRef(0);

  const { token, user } = useSelector((s) => s.auth);
  const { selectedChat, loadingDetail, chats } = useSelector((s) => s.community);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [inputHeight, setInputHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  /* UI STATE */
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());
  const [typingUserIds, setTypingUserIds] = useState(() => new Set());
  const [contextMessage, setContextMessage] = useState(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [reactionModalMessageId, setReactionModalMessageId] = useState(null);

  /* DELETE MODALS */
  const [confirmDeleteMeVisible, setConfirmDeleteMeVisible] = useState(false);
  const [confirmDeleteEveryoneVisible, setConfirmDeleteEveryoneVisible] = useState(false);
  const [deleteOptionsVisible, setDeleteOptionsVisible] = useState(false);

  /* =====================================================
     HELPERS
  ===================================================== */
  const normalizeId = (v) => {
    if (!v) return null;
    if (typeof v === "string") return v;
    if (typeof v === "object") {
      return String(v._id || v.id || v.userId || v);
    }
    return null;
  };

  const normalizePresenceId = (payload) =>
    String(payload?.userId || payload?.user || payload?.id || payload?._id || "");

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

  const resolvedUserId = user?._id || getUserIdFromToken(token);
  const myId = resolvedUserId ? String(resolvedUserId) : null;

  const safeId = (v) => {
    if (!v) return null;
    if (typeof v === "string") return v;
    if (typeof v === "object") return String(v._id || v.id || "");
    return null;
  };

  const getSenderId = (msg) => {
    const sid = safeId(msg?.sender?._id) || safeId(msg?.sender?.id) || safeId(msg?.sender);
    return sid ? String(sid) : null;
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

  const getMemberName = (userId) => {
    if (!userId) return "Member";

    // 1️⃣ Try messages first (BEST SOURCE)
    const msg = messages.find(
      (m) => String(getSenderId(m)) === String(userId)
    );

    if (msg) {
      return getSenderNameFromMessage(msg);
    }

    // 2️⃣ Fallback to group members
    const member = members.find((m) => {
      const uid = normalizeId(m?.user || m);
      return uid && String(uid) === String(userId);
    });

    return (
      member?.user?.profile?.fullName ||
      member?.user?.fullName ||
      member?.fullName ||
      "Member"
    );
  };

  const getMemberById = (id) => {
    if (!id) return null;

    const group = selectedChat?.group;
    const members = group?.members || [];

    const found = members.find((m) => {
      const uid =
        normalizeId(m?.user?._id) ||
        normalizeId(m?.user?.id) ||
        normalizeId(m?.user) ||
        normalizeId(m?._id);

      return uid && String(uid) === String(id);
    });

    if (!found) {
      console.warn("❌ MEMBER NOT FOUND FOR ID", {
        id,
        memberIds: members.map((m) =>
          normalizeId(m?.user || m)
        ),
      });
    } else {
      console.log("✅ MEMBER FOUND", {
        id,
        resolvedName:
          found?.user?.profile?.fullName ||
          found?.user?.fullName ||
          found?.user?.name ||
          found?.fullName ||
          "Member",
      });
    }

    return found || null;
  };

  const getReactionUserAvatar = (user) => {
    if (!user) return null;

    return (
      user?.profile?.avatar?.url ||
      user?.profile?.avatar ||
      user?.avatar?.url ||
      user?.avatar ||
      null
    );
  };

  const getSenderNameFromMessage = (msg) => {
    if (msg?.sender?.profile?.fullName) return msg.sender.profile.fullName;
    if (msg?.sender?.fullName) return msg.sender.fullName;
    if (msg?.sender?.name) return msg.sender.name;
    const senderId = getSenderId(msg);
    return getMemberName(senderId);
  };

  const getSenderAvatarFromMessage = (msg) =>
    msg?.sender?.profile?.avatar?.url ||
    msg?.sender?.profile?.avatar ||
    msg?.sender?.avatar?.url ||
    msg?.sender?.avatar || null;

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

  const group = selectedChat?.group;
  const groupId = group?._id;
  const members = group?.members || [];
  const messages = selectedChat?.messages || [];
  const pinnedMessage = useMemo(() => {
    if (!selectedChat?.pinnedMessage) return null;

    return selectedChat.messages?.find(
      (m) => String(m._id) === String(selectedChat.pinnedMessage)
    ) || null;
  }, [selectedChat?.pinnedMessage, selectedChat?.messages]);


  /* =====================================================
     VIEWABILITY CONFIG FOR READ RECEIPTS
  ===================================================== */
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 300,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (!socketRef.current || !chatId || !myId) return;

    viewableItems.forEach(({ item }) => {
      if (!item || item.type !== "message" || !item._id) return;

      const isMine = String(getSenderId(item)) === String(myId);
      if (isMine) return;

      const messageId = String(item._id);
      const alreadyRead = Array.isArray(item.readBy) &&
        item.readBy.some(r => String(r.user || r) === String(myId));

      if (alreadyRead) {
        readEmittedRef.current.add(messageId);
        return;
      }

      if (readEmittedRef.current.has(messageId)) return;

      readQueueRef.current.add(messageId);
      readEmittedRef.current.add(messageId);
    });

    scheduleReadFlush();
  }).current;

  const onMomentumScrollEnd = useCallback(() => {
    flushReadQueue();
  }, []);

  const scheduleReadFlush = () => {
    if (readFlushTimerRef.current) return;

    readFlushTimerRef.current = setTimeout(() => {
      flushReadQueue();
    }, 500);
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

    socketRef.current.emit("group:read:batch", {
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
    setContextMenuVisible(false); // ✅ ADD
    requestAnimationFrame(() => {
      setConfirmDeleteMeVisible(true);
    });
  };

  const requestDeleteForEveryone = () => {
    setDeleteOptionsVisible(false);
    setContextMenuVisible(false); // ✅ ADD
    requestAnimationFrame(() => {
      setConfirmDeleteEveryoneVisible(true);
    });
  };

  /* =====================================================
     REACTIONS
  ===================================================== */
  const toggleReaction = (message, emoji = null) => {
    if (!message?._id || !socketRef.current) return;

    socketRef.current.emit("group:reaction", {
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

  const getTotalReactionCount = (message) => {
    if (!Array.isArray(message?.reactions)) return 0;
    const uniqueUsers = new Set(message.reactions.map(r => String(r.user?._id || r.user)));
    return uniqueUsers.size;
  };

  const reactionModalMessage = useMemo(() => {
    if (!reactionModalMessageId) return null;
    return messages.find((m) => String(m._id) === String(reactionModalMessageId));
  }, [reactionModalMessageId, messages]);

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

    const readBy = Array.isArray(message?.readBy) ? message.readBy : [];
    const isRead = readBy.some((r) => String(r.user) !== String(myId));

    if (isRead) {
      return { icon: "checkmark-done", color: "#2563EB" };
    }

    return { icon: "checkmark-done", color: "#9CA3AF" };
  };

  /* =====================================================
     PIN / UNPIN
  ===================================================== */
  const doPin = () => {
    if (!contextMessage?._id || !socketRef.current) return;

    socketRef.current.emit("group:pin", {
      chatId,
      messageId: contextMessage._id,
    });

    closeContextMenu();
  };

  /* =====================================================
     KEYBOARD HANDLING
  ===================================================== */
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardHeightRef.current = e.endCoordinates.height;
      setKeyboardVisible(true);
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
   USER LOOKUP MAP (CRITICAL FOR REACTIONS)
===================================================== */
  const userMap = useMemo(() => {
    const map = new Map();

    // 1️⃣ Group members (best source)
    members.forEach((m) => {
      const user = m?.user || m;
      const uid = normalizeId(user);
      if (uid && typeof user === "object") {
        map.set(uid, user);
      }
    });

    // 2️⃣ Message senders (fallback)
    messages.forEach((msg) => {
      const sender = msg?.sender;
      const sid = normalizeId(sender);
      if (sid && typeof sender === "object") {
        map.set(sid, sender);
      }
    });

    return map;
  }, [members, messages]);

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
    readEmittedRef.current.clear();

    return () => {
      readEmittedRef.current.clear();
      flushReadQueue();
    };
  }, [chatId]);

  /* =====================================================
     SOCKET (REALTIME WITH ALL FEATURES)
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

        setTimeout(() => {
          listRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    socket.on("group:group:new", onGroupMessage);

    /* ================= REACTIONS ================= */
    socket.on("group:reaction:update", ({ chatId, messageId, reactions }) => {
      if (String(chatId) !== String(currentChatId)) return;

      dispatch(updateMessageReactions({
        chatId,
        messageId,
        reactions,
      }));
    });

    /* ================= PIN UPDATE ================= */
    socket.on("group:pin:update", ({ chatId: id, pinnedMessage }) => {
      if (String(id) !== String(chatId)) return;

      dispatch(
        updatePinnedMessage({
          chatId: id,
          pinnedMessage,
        })
      );
    });

    /* ================= DELETE ================= */
    socket.on("group:delete:me:update", ({ chatId: id, messageId, userId }) => {
      if (String(id) !== String(chatId)) return;

      // Only apply if this delete is for ME
      if (String(userId) !== String(myId)) return;

      dispatch(
        deleteMessageForMe({
          messageId: String(messageId),
          userId: String(userId),
        })
      );
    });

    socket.on("group:delete:everyone:update", ({ chatId: id, messageId }) => {
      if (String(id) !== String(chatId)) return;

      dispatch(
        deleteMessageForEveryone({
          messageId: String(messageId),
          userId: String(messageId),
        })
      );
    });

    /* ================= GROUP TYPING ================= */
    socket.on("group:typing:start", ({ userId }) => {
      if (!userId) return;
      if (String(userId) === String(myId)) return;

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
    socket.emit("group:presence:whois", { groupId }, (res) => {

      if (!res?.success || !Array.isArray(res.data)) return;

      const ids = new Set(
        res.data
          .map(u => normalizePresenceId(u))
          .filter(Boolean)
          .filter(id => id !== String(myId)) // exclude self
      );

      setOnlineUserIds(ids);

    });

    socket.on("group:user:online", (payload) => {
      const uid = normalizePresenceId(payload);
      if (!uid || uid === String(myId)) return;

      setOnlineUserIds(prev => {
        const next = new Set(prev);
        next.add(uid);
        return next;
      });
    });

    socket.on("group:user:offline", (payload) => {
      const uid = normalizePresenceId(payload);
      if (!uid) return;

      setOnlineUserIds(prev => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
    });

    socket.on("group:user:offline", ({ userId }) => {
      setOnlineUserIds(prev => {
        const next = new Set(prev);
        next.delete(String(userId));
        return next;
      });
    });

    /* ================= BATCH READ ================= */
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

    socket.on("group:read:batch", handleBatchRead);

    /* ================= CLEANUP ================= */
    return () => {
      emitTypingStop();
      socket.emit("group:leave", { groupId });

      socket.off("group:group:new", onGroupMessage);
      socket.off("group:reaction:update");
      socket.off("group:pin:update");
      socket.off("group:delete:everyone:update");
      socket.off("group:typing:start");
      socket.off("group:typing:stop");
      socket.off("group:user:online");
      socket.off("group:user:offline");
      socket.off("group:read:batch", handleBatchRead);

      readQueueRef.current.clear();
      clearTimeout(readFlushTimerRef.current);
      // socket.disconnect();
      // socketRef.current = null;
      // readQueueRef.current.clear();
      // readFlushTimerRef.current && clearTimeout(readFlushTimerRef.current);
      // readFlushTimerRef.current = null;
    };
  }, [groupId, token, chatId, myId]);

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
     LEAVE GROUP HANDLING
  ===================================================== */
  const handleLeaveConfirmed = async () => {
    if (!groupId) return;

    try {
      socketRef.current?.emit("group:leave", { groupId });

      await dispatch(leaveGroup(groupId)).unwrap();

      setShowLeaveModal(false);
      router.replace("/community");
    } catch (err) {
      console.error("[GroupChat] ❌ Leave failed", err);
      Alert.alert("Error", "Unable to leave the group. Please try again.");
    }
  };

  /* =====================================================
     DATE GROUPING WITH SEPARATORS
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

  const messagesWithDates = useMemo(() => {
    const sortedMessages = [...uniqueMessages].sort(
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
          _id: `date-${msgDate.toISOString().slice(0, 10)}`,
          type: "date",
          label: formatDateLabel(msgDate),
        });
        lastDate = msgDate;
      }

      result.push({ ...msg, type: "message" });
    });

    return result;
  }, [uniqueMessages]);

  /* =====================================================
     HEADER STATUS TEXT
  ===================================================== */
  const typingNames = useMemo(() => {
    if (!typingUserIds.size) return [];

    return Array.from(typingUserIds)
      .filter((id) => String(id) !== String(myId))
      .map((id) => getMemberName(id))
      .filter(Boolean)
      .slice(0, 2);
  }, [typingUserIds, myId, members]); // ← ADD members

  useEffect(() => {

  }, [typingUserIds]);

  const onlineCount = useMemo(() => {
    // Guards
    if (!Array.isArray(members) || members.length === 0) return 0;
    if (!(onlineUserIds instanceof Set) || onlineUserIds.size === 0) return 0;
    if (!myId) return 0;

    let count = 0;

    for (const member of members) {
      // member shape: { user: { _id, profile, ... } }
      const uid = normalizeId(member?.user || member);

      if (!uid) continue;

      // ❌ exclude myself
      if (uid === String(myId)) continue;

      // ✅ strict match against presence Set (strings only)
      if (onlineUserIds.has(uid)) {
        count += 1;
      }
    }

    return count;
  }, [members, onlineUserIds, myId]);


  const headerSubtitle = useMemo(() => {
    if (typingNames.length === 1) {
      return `${typingNames[0]} is typing…`;
    }

    if (typingNames.length === 2) {
      return `${typingNames[0]} & ${typingNames[1]} are typing…`;
    }

    if (typingUserIds.size > 2) {
      return `Several people are typing…`;
    }

    if (onlineCount > 0) {
      return `${onlineCount} online • ${members.length} members`;
    }

    return `${members.length} members`;
  }, [typingNames, typingUserIds, onlineCount, members.length]);

  /* =====================================================
     LONG PRESS MENU ACTIONS
  ===================================================== */
  const openContextMenu = (msg) => {
    setContextMessage(msg);
    setContextMenuVisible(true);
  };

  const closeContextMenu = () => {
    setContextMenuVisible(false);
    // setContextMessage(null);
  };

  const doReply = () => {
    if (!contextMessage) return;
    setReplyTo(contextMessage);
    closeContextMenu();
  };

  const doCopy = async () => {
    if (!contextMessage) return;
    await copyToClipboard(contextMessage?.ciphertext);
    closeContextMenu();
  };

  /* =====================================================
     MESSAGE ROW COMPONENT WITH ALL FEATURES
  ===================================================== */
  const MessageRow = React.memo(function MessageRow({ item }) {
    const swipeRef = useRef(null);

    const senderId = getSenderId(item);
    const isMine = myId && senderId && String(senderId) === String(myId);

    const deletedForEveryone = item.isDeletedForEveryone === true;
    const deletedForMe =
      !deletedForEveryone &&
      Array.isArray(item.deletedFor) &&
      item.deletedFor.map(String).includes(String(myId));

    const showDeletedBubble = deletedForEveryone || deletedForMe;
    const deletedText = deletedForEveryone
      ? "This message was deleted"
      : "This message was deleted from me";

    const senderName = getSenderNameFromMessage(item);
    const senderAvatar = getSenderAvatarFromMessage(item) || getMemberAvatar(senderId) || null;

    const replied =
      typeof item.replyTo === "object"
        ? item.replyTo
        : messages.find((m) => String(m._id) === String(item.replyTo));

    const replyPreviewText = replied?.ciphertext || null;
    const replyPreviewSenderName = getSenderNameFromMessage(replied) || null;

    const onSwipeReply = () => {
      if (showDeletedBubble) return;
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

    const isPinned = String(item._id) === String(pinnedMessage);
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
          <View style={[tw`mb-5 flex-row`, isMine ? tw`justify-end` : tw`justify-start`]}>
            {!isMine && senderAvatar && (
              <Image
                source={{ uri: senderAvatar }}
                style={tw`w-9 h-9 rounded-full mr-3`}
              />
            )}

            <View
              style={[
                tw`px-4 py-3 rounded-2xl max-w-[82%]`,
                isMine ? tw`bg-white border border-gray-200` : tw`bg-purple-600`,
              ]}
            >
              {/* PIN INDICATOR */}
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

              {/* SENDER NAME (GROUP ONLY) */}
              {!isMine && !showDeletedBubble && (
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
              {!!replyPreviewText && !showDeletedBubble && (
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
                            isMine ? tw`bg-gray-100` : tw`bg-purple-400`,
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
              <Ionicons name="ellipsis-vertical" size={22} color="#FFD700" />
            </TouchableOpacity>
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
                socketRef.current?.emit("group:pin", {
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

          {/* SENDER INFO */}
          <View style={tw`flex-row items-center mt-2 ml-11`}>
            {pinnedMessage.sender && (
              <>
                <Image
                  source={
                    getSenderAvatarFromMessage(pinnedMessage)
                      ? { uri: getSenderAvatarFromMessage(pinnedMessage) }
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
                  {getSenderNameFromMessage(pinnedMessage)}
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
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
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
          setContextMessage(null);
        }}
        onConfirm={() => {
          if (!contextMessage) return;

          dispatch(deleteMessageForMe({
            messageId: contextMessage._id,
            userId: myId,
          }));

          socketRef.current?.emit("group:delete:me", {
            chatId,
            messageId: contextMessage._id,
          });

          setConfirmDeleteMeVisible(false);
          setDeleteOptionsVisible(false);  // ✅ ADD
          setContextMenuVisible(false);    // ✅ ADD
          setContextMessage(null);
        }}

      />

      {/* ================= DELETE FOR EVERYONE MODAL ================= */}
      <ConfirmModal
        visible={confirmDeleteEveryoneVisible}
        title="Delete for everyone?"
        message="This message will be deleted for everyone in the group."
        confirmText="Delete"
        destructive
        onCancel={() => {
          setConfirmDeleteEveryoneVisible(false);
          setContextMessage(null);
        }}
        onConfirm={() => {
          if (!contextMessage) return;

          dispatch(deleteMessageForEveryone({
            messageId: String(contextMessage._id),
          }));

          socketRef.current?.emit("group:delete:everyone", {
            chatId,
            messageId: contextMessage._id,
          });

          setConfirmDeleteEveryoneVisible(false);
          setDeleteOptionsVisible(false);  // ✅ ADD
          setContextMenuVisible(false);    // ✅ ADD
          setContextMessage(null);
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
                  Remove this message for all group members
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
                {String(contextMessage?._id) === String(pinnedMessage)
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
            {String(getSenderId(contextMessage)) === String(myId) && (
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

      {/* ================= REACTION DETAILS MODAL ================= */}
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
                const reactionUserId = safeId(item.user);

                // 🔑 RESOLVE FROM KNOWN USERS (THIS IS THE FIX)
                const reactionUser =
                  userMap.get(reactionUserId) || item.user;

                const isMine = reactionUserId === myId;

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
                      <Text style={tw`text-2xl mr-4`}>{item.emoji}</Text>

                      <View style={tw`flex-row items-center flex-1`}>
                        <Image
                          source={
                            getReactionUserAvatar(reactionUser)
                              ? { uri: getReactionUserAvatar(reactionUser) }
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
                            {getMemberName(reactionUserId)}
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
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
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
                          Tap to remove
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
              Replying to {getSenderNameFromMessage(replyTo)}
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