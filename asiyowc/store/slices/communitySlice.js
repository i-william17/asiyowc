import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { communityService } from "../../services/community";

/* ============================================================
   CREATE OR GET DIRECT MESSAGE CHAT
============================================================ */
export const createOrGetDMChat = createAsyncThunk(
  "community/createOrGetDMChat",
  async ({ participantId }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      const pid =
        typeof participantId === "object" && participantId !== null
          ? participantId._id || participantId.id
          : participantId;

      if (!token) throw new Error("Auth token missing");
      if (!pid) throw new Error("Invalid participantId");

      const res = await communityService.createChat(
        {
          type: "dm",
          participants: [pid],
        },
        token
      );

      return res.data;
    } catch (err) {
      return rejectWithValue(
        err?.message || "Failed to create or fetch chat"
      );
    }
  }
);

/* ===========================
   LISTS
=========================== */
export const fetchGroups = createAsyncThunk(
  "community/fetchGroups",
  async (_, { getState, rejectWithValue }) => {
    try {
      return await communityService.getGroups(getState().auth.token);
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to load groups");
    }
  }
);

export const fetchHubs = createAsyncThunk(
  "community/fetchHubs",
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      const res = await communityService.getHubs(token);

      return res;
    } catch (e) {
      console.error("❌ [fetchHubs] ERROR:", e);
      return rejectWithValue(e?.message || "Failed to load hubs");
    }
  }
);

export const fetchChats = createAsyncThunk(
  "community/fetchChats",
  async (_, { getState, rejectWithValue }) => {
    try {
      return await communityService.getChats(getState().auth.token);
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to load chats");
    }
  }
);

export const fetchVoices = createAsyncThunk(
  "community/fetchVoices",
  async (_, { getState, rejectWithValue }) => {
    try {
      return await communityService.getVoices(getState().auth.token);
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to load rooms");
    }
  }
);

/* ===========================
   DETAILS
=========================== */
export const fetchGroupDetail = createAsyncThunk(
  "community/fetchGroupDetail",
  async (id, { getState, rejectWithValue }) => {
    try {
      return await communityService.getGroupById(id, getState().auth.token);
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to load group");
    }
  }
);

export const fetchHubDetail = createAsyncThunk(
  "community/fetchHubDetail",
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      const res = await communityService.getHubById(id, token);

      // ✅ RETURN HUB ONLY
      return res.data;
    } catch (e) {
      console.error("❌ [fetchHubDetail] ERROR:", e);
      return rejectWithValue(e?.message || "Failed to load hub");
    }
  }
);

export const fetchChatDetail = createAsyncThunk(
  "community/fetchChatDetail",
  async (
    { chatId, before = null, limit = 30, append = "replace" },
    { getState, rejectWithValue }
  ) => {
    try {
      const token = getState().auth.token;

      const res = await communityService.getChatById(
        chatId,
        token,
        { before, limit } // pass to backend
      );

      return {
        chat: res.data,
        append,
      };
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to load chat");
    }
  }
);

export const fetchVoiceDetail = createAsyncThunk(
  "community/fetchVoiceDetail",
  async (voiceId, { getState, rejectWithValue }) => {
    try {
      return await communityService.getVoiceById(
        voiceId,
        getState().auth.token
      );
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to load voice room");
    }
  }
);

export const fetchVoiceInstance = createAsyncThunk(
  "community/fetchVoiceInstance",
  async (instanceId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      const res = await communityService.getVoiceInstance(
        instanceId,
        token
      );

      // 🔑 NORMALIZE PAYLOAD
      return {
        room: res.data.room,       // ✅ FIX
        instance: res.data.instance,
        role: res.data.role,
        chatEnabled: res.data.chatEnabled,
        lockedStage: res.data.lockedStage,
      };

    } catch (err) {
      return rejectWithValue(
        err.message || "Failed to load voice instance"
      );
    }
  }
);

/* ===========================
   JOIN / LEAVE GROUP
=========================== */
export const createGroup = createAsyncThunk(
  "community/createGroup",
  async (payload, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      const res = await communityService.createGroup(
        payload,
        token
      );

      return res?.data;
    } catch (e) {
      return rejectWithValue(
        e?.message || "Failed to create group"
      );
    }
  }
);

export const joinGroup = createAsyncThunk(
  "community/joinGroup",
  async ({ groupId, inviteToken = null }, { getState, rejectWithValue }) => {
    try {
      const res = await communityService.joinGroup(
        groupId,
        getState().auth.token,
        inviteToken
      );

      return res?.data;
    } catch (e) {
      return rejectWithValue(
        e?.message || "Failed to join group"
      );
    }
  }
);

export const generateGroupInviteLink = createAsyncThunk(
  "community/generateGroupInviteLink",
  async (groupId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      const res = await communityService.generateGroupInviteLink(
        groupId,
        token
      );

      return res?.data; // { inviteToken, inviteLink }
    } catch (e) {
      return rejectWithValue(
        e?.message || "Failed to generate invite link"
      );
    }
  }
);

export const leaveGroup = createAsyncThunk(
  "community/leaveGroup",
  async (groupId, { getState, rejectWithValue }) => {
    try {
      const res = await communityService.leaveGroup(
        groupId,
        getState().auth.token
      );
      return res?.data;
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to leave group");
    }
  }
);

export const deleteChat = createAsyncThunk(
  "community/deleteChat",
  async (chatId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      await communityService.deleteChat(chatId, token);
      return chatId;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteGroup = createAsyncThunk(
  "community/deleteGroup",
  async (groupId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      const res = await communityService.deleteGroup(
        groupId,
        token
      );

      return { groupId };
    } catch (e) {
      return rejectWithValue(
        e?.message || "Failed to delete group"
      );
    }
  }
);

/* ===========================
   DM MESSAGE
=========================== */
export const sendChatMessage = createAsyncThunk(
  "community/sendChatMessage",
  async ({ chatId, payload }, { getState, rejectWithValue }) => {
    try {
      return await communityService.sendMessage(
        chatId,
        payload,
        getState().auth.token
      );
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to send message");
    }
  }
);

/* ===========================
   GROUP CHAT
=========================== */
export const fetchGroupConversation = createAsyncThunk(
  "community/fetchGroupConversation",
  async (
    { chatId, before = null, limit = 30, append = "replace" },
    { getState, rejectWithValue }
  ) => {
    try {
      const token = getState().auth.token;

      const res = await communityService.getGroupConversationByChatId(
        chatId,
        token,
        { before, limit }
      );

      return {
        chat: res.data.chat,     // 🔥 correct
        group: res.data.group,  // 🔥 include group
        append,
      };

    } catch (e) {
      return rejectWithValue(e?.message || "Failed to load group conversation");
    }
  }
);

export const sendGroupMessage = createAsyncThunk(
  "community/sendGroupMessage",
  async ({ groupId, chatId, payload }, { getState, rejectWithValue }) => {
    try {
      return await communityService.sendGroupMessage(
        groupId,
        chatId,
        payload,
        getState().auth.token
      );
    } catch (e) {
      return rejectWithValue(e.message);
    }
  }
);

/* ===========================
   JOIN / LEAVE HUB
=========================== */
export const joinHub = createAsyncThunk(
  "community/joinHub",
  async (hubId, { getState, rejectWithValue }) => {
    try {
      const res = await communityService.joinHub(
        hubId,
        getState().auth.token
      );
      return res?.data; // should return updated hub
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to join hub");
    }
  }
);

export const leaveHub = createAsyncThunk(
  "community/leaveHub",
  async (hubId, { getState, rejectWithValue }) => {
    try {
      const res = await communityService.leaveHub(
        hubId,
        getState().auth.token
      );
      return res?.data; // should return updated hub
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to leave hub");
    }
  }
);

/* ===========================
   HUB UPDATES (ANNOUNCEMENTS)
=========================== */

export const fetchHubUpdates = createAsyncThunk(
  "community/fetchHubUpdates",
  async (
    { hubId, page = 1, limit = 20, append = false },
    { getState, rejectWithValue }
  ) => {
    try {
      const token = getState().auth.token;

      const res = await communityService.getHubUpdates(
        hubId,
        token,
        { page, limit }
      );

      return {
        ...res.data,
        append,
      };
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to load updates");
    }
  }
);

export const createHubUpdate = createAsyncThunk(
  "community/createHubUpdate",
  async (
    { hubId, formData, onUploadProgress },
    { getState, rejectWithValue }
  ) => {
    try {
      const token = getState().auth.token;

      const res = await communityService.createHubUpdate(
        hubId,
        formData,
        token,
        onUploadProgress
      );

      return res;
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to create update");
    }
  }
);

export const deleteHubUpdate = createAsyncThunk(
  "community/deleteHubUpdate",
  async ({ hubId, updateId }, { getState, rejectWithValue }) => {
    try {
      await communityService.deleteHubUpdate(
        hubId,
        updateId,
        getState().auth.token
      );
      return { updateId };
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to delete update");
    }
  }
);

export const reactHubUpdate = createAsyncThunk(
  "community/reactHubUpdate",
  async ({ hubId, updateId, emoji }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      const res = await communityService.reactHubUpdate(
        hubId,
        updateId,
        { emoji }, // ✅ ALWAYS send object payload
        token
      );

      // ✅ Normalize to array no matter what backend returns
      const reactions =
        res?.data?.data?.reactions ??
        res?.data?.data ??
        res?.data?.reactions ??
        res?.data ??
        [];

      return {
        updateId,
        reactions: Array.isArray(reactions) ? reactions : [],
      };
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to react");
    }
  }
);

/* ===========================
   CREATE VOICE ROOM
=========================== */
export const createVoiceRoom = createAsyncThunk(
  "community/createVoiceRoom",
  async (payload, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      if (!token) throw new Error("Auth token missing");

      const res = await communityService.createVoice(
        payload,
        token
      );

      return res?.data; // backend returns { success, data }
    } catch (e) {
      return rejectWithValue(
        e?.message || "Failed to create voice room"
      );
    }
  }
);

export const deleteVoiceRoom = createAsyncThunk(
  "community/deleteVoiceRoom",
  async (voiceId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;

      const res = await communityService.deleteVoice(
        voiceId,
        token
      );

      return {
        voiceId,
        data: res?.data,
      };
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to delete room");
    }
  }
);

/* ===========================
   REPORT CONTENT
=========================== */
export const reportContent = createAsyncThunk(
  "community/reportContent",
  async (
    { targetType, targetId, reason },
    { getState, rejectWithValue }
  ) => {
    try {
      const token = getState().auth.token;

      const res = await communityService.reportContent(
        targetType,
        targetId,
        reason,
        token
      );

      return res?.data;
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to submit report");
    }
  }
);

/* ============================================================
   SLICE
============================================================ */
const communitySlice = createSlice({
  name: "community",

  initialState: {
    // existing
    groups: [],
    hubs: [],
    chats: [],
    voices: [],
    selectedGroup: null,
    selectedHub: null,
    selectedChat: null,
    selectedVoice: null,
    joinedGroups: {},
    loadingList: false,
    loadingDetail: false,
    sendingMessage: false,
    error: null,
    pinnedMessages: {},

    /* =====================
   HUB UPDATES
===================== */
    hubUpdates: [],
    hubUpdatesLoading: false,
    hubUpdatesPage: 1,
    hubUpdatesHasMore: true,
    hubUpdatesTotal: 0,

    /* =====================
       VOICE (🔥 REQUIRED)
    ===================== */
    room: null,
    instance: null,
    role: null,

    chatEnabled: true,
    lockedStage: false,

    messages: [],
    speakingUsers: {},
    voiceRequests: [],
    lastHeartbeat: null,
    voiceChatMessages: [],
    /* =====================
   VOICE TOASTS (EPHEMERAL)
===================== */
    chatToasts: [],
    voiceErrors: null, // ✅ Added missing field

    /* =====================
       REPORT CONTENT
    ===================== */
    reportLoading: false,
    reportSuccess: false,
  },

  reducers: {
    clearCommunityError: (s) => {
      s.error = null;
    },

    /* =====================================================
       REALTIME MESSAGE INSERT (SAFE)
    ===================================================== */
    pushIncomingMessage: (s, a) => {
      const { chatId, message } = a.payload || {};
      if (!s.selectedChat || s.selectedChat._id !== chatId) return;

      if (!Array.isArray(s.selectedChat.messages)) {
        s.selectedChat.messages = [];
      }

      const exists = s.selectedChat.messages.some(
        (m) => String(m._id) === String(message._id)
      );

      if (!exists) {
        s.selectedChat.messages.push(message);
      }
    },

    /* =====================================================
       READ / DELIVERY RECEIPTS
    ===================================================== */
    updateMessageReceipt: (state, action) => {
      const { messageId, userId } = action.payload;
      if (!messageId || !userId) return;

      // 1️⃣ Update selectedChat
      const msg = state.selectedChat?.messages?.find(
        (m) => String(m._id) === String(messageId)
      );

      if (msg) {
        msg.readBy = Array.isArray(msg.readBy) ? msg.readBy : [];

        const exists = msg.readBy.some(
          (r) => String(r.user || r) === String(userId)
        );

        if (!exists) {
          msg.readBy.push({
            user: userId,
            readAt: new Date().toISOString(),
          });
        }
      }

      // 2️⃣ ALSO update chats list (🔥 THIS FIXES UNREAD COUNT + REVERTING)
      const chat = state.chats.find((c) =>
        c.messages?.some((m) => String(m._id) === String(messageId))
      );

      if (chat) {
        const chatMsg = chat.messages.find(
          (m) => String(m._id) === String(messageId)
        );

        if (chatMsg) {
          chatMsg.readBy = Array.isArray(chatMsg.readBy) ? chatMsg.readBy : [];

          const exists = chatMsg.readBy.some(
            (r) => String(r.user || r) === String(userId)
          );

          if (!exists) {
            chatMsg.readBy.push({
              user: userId,
              readAt: new Date().toISOString(),
            });
          }
        }
      }
    },

    /* =====================================================
       REACTIONS (REALTIME SAFE)
    ===================================================== */
    updateMessageReactions: (state, action) => {
      const { chatId, message, messageId, reactions } = action.payload || {};
      if (!chatId || !state.selectedChat) return;
      if (String(state.selectedChat._id) !== String(chatId)) return;

      const msgs = state.selectedChat.messages;
      if (!Array.isArray(msgs)) return;

      // DM: backend sends full updated message
      if (message?._id) {
        const idx = msgs.findIndex((m) => String(m._id) === String(message._id));
        if (idx === -1) return;

        // ✅ SOURCE OF TRUTH: replace entire message
        msgs[idx] = message;
        return;
      }

      // Group: backend sends messageId + reactions only
      const resolvedId = messageId;
      if (!resolvedId) return;

      const idx = msgs.findIndex((m) => String(m._id) === String(resolvedId));
      if (idx === -1) return;

      msgs[idx].reactions = reactions || [];
    },

    /* =====================================================
       PIN / UNPIN MESSAGE
    ===================================================== */
    updatePinnedMessage: (state, action) => {
      const { chatId, pinnedMessage } = action.payload || {};
      if (!chatId) return;

      let pinnedId = null;

      // 🔐 SAFE NORMALIZATION
      if (pinnedMessage) {
        if (typeof pinnedMessage === "object") {
          if (pinnedMessage._id) {
            pinnedId = String(pinnedMessage._id);
          }
        } else {
          pinnedId = String(pinnedMessage);
        }
      }

      // 1️⃣ Update selectedChat
      if (
        state.selectedChat &&
        String(state.selectedChat._id) === String(chatId)
      ) {
        state.selectedChat.pinnedMessage = pinnedId;
      }

      // 2️⃣ Update chats list
      const chat = state.chats.find(
        (c) => String(c._id) === String(chatId)
      );

      if (chat) {
        chat.pinnedMessage = pinnedId;
      }
    },

    updateBlockedUsers: (state, action) => {
      const { chatId, blockedUsers } = action.payload;

      const normalized = Array.isArray(blockedUsers)
        ? blockedUsers.map((x) => String(x))
        : [];

      if (state.selectedChat && String(state.selectedChat._id) === String(chatId)) {
        state.selectedChat.blockedUsers = normalized;
      }

      const chat = state.chats.find((c) => String(c._id) === String(chatId));
      if (chat) chat.blockedUsers = normalized;
    },

    /* =====================================================
   HUB UPDATES (REALTIME SAFE)
===================================================== */

    addHubUpdate: (state, action) => {
      const update = action.payload;
      if (!update || !update._id) return;

      const exists = state.hubUpdates.some(
        (u) => String(u._id) === String(update._id)
      );

      if (!exists) {
        state.hubUpdates.unshift(update);
      }
    },

    updateHubUpdateReactions: (state, action) => {
      const { updateId, reactions } = action.payload || {};
      if (!updateId) return;

      const item = state.hubUpdates.find(
        (u) => String(u._id) === String(updateId)
      );

      if (item) {
        item.reactions = reactions;
      }
    },

    updatePinnedUpdate: (state, action) => {
      if (!state.selectedHub) return;

      const pinnedUpdate = action.payload;

      if (!pinnedUpdate) {
        state.selectedHub.pinnedUpdate = null;
        state.selectedHub.pinnedUpdateFull = null;
        return;
      }

      state.selectedHub.pinnedUpdate = pinnedUpdate._id;
      state.selectedHub.pinnedUpdateFull = pinnedUpdate;
    },

    removeHubUpdate: (state, action) => {
      const updateId = action.payload;

      state.hubUpdates = state.hubUpdates.filter(
        (u) => String(u._id) !== String(updateId)
      );

      if (state.selectedHub?.updates) {
        state.selectedHub.updates = state.selectedHub.updates.filter(
          (u) => String(u._id) !== String(updateId)
        );
      }

      // 🔥 If deleted update was pinned → unpin it
      if (state.selectedHub?.pinnedUpdate === updateId) {
        state.selectedHub.pinnedUpdate = null;
      }
    },

    markChatRead: (state, action) => {
      const { chatId, userId, seq } = action.payload || {};
      if (!chatId || !userId || typeof seq !== "number") return;

      const chat = state.chats.find((c) => String(c._id) === String(chatId));
      if (!chat) return;

      chat.readState = Array.isArray(chat.readState) ? chat.readState : [];

      const entry = chat.readState.find((r) => String(r.user) === String(userId));

      if (entry) {
        entry.lastReadSeq = Math.max(entry.lastReadSeq || 0, seq);
      } else {
        chat.readState.push({ user: userId, lastReadSeq: seq });
      }

      // Optional: keep selectedChat in sync too
      if (state.selectedChat && String(state.selectedChat._id) === String(chatId)) {
        state.selectedChat.readState = chat.readState;
      }
    },

    /* =====================================================
       DELETE (WHATSAPP STYLE)
    ===================================================== */
    deleteMessageForMe: (state, action) => {
      const { messageId, userId } = action.payload;
      const msg = state.selectedChat?.messages?.find(
        (m) => String(m._id) === String(messageId)
      );
      if (!msg) return;

      msg.deletedFor = msg.deletedFor || [];
      if (!msg.deletedFor.includes(userId)) {
        msg.deletedFor.push(userId);
      }
    },

    deleteMessageForEveryone: (state, action) => {
      const { messageId } = action.payload;

      const chat = state.selectedChat;
      if (!chat?.messages) return;

      const msg = chat.messages.find(
        (m) => String(m._id) === String(messageId)
      );

      if (!msg) return;

      msg.isDeletedForEveryone = true;
      msg.deletedAt = new Date().toISOString();
    },

    /* =====================================================
       EDIT MESSAGE
    ===================================================== */
    updateEditedMessage: (s, a) => {
      const { messageId, message } = a.payload || {};
      const msg = s.selectedChat?.messages?.find(
        (m) => String(m._id) === String(messageId)
      );
      if (msg && message) {
        Object.assign(msg, message);
      }
    },

    /* =====================================================
       VOICE ROOM – SESSION LIFECYCLE
       WITH PROFESSIONAL REFINEMENTS:
       - ✅ Array safety guards
       - ✅ Source tracking for approvals/demotions
       - ✅ SpeakingUsers cleanup
       - ✅ Data integrity protection
       - ✅ FIXED: All filtering now uses req.userId
    ===================================================== */
    voiceJoined: (state, action) => {
      const { room, instance, role, chatEnabled, lockedStage, reconnected } =
        action.payload;

      state.room = room;
      state.instance = instance;
      state.role = role ?? state.role;

      state.chatEnabled = chatEnabled ?? state.chatEnabled;
      state.lockedStage = lockedStage ?? state.lockedStage;

      if (!reconnected) {
        state.messages = [];
        state.speakingUsers = {};
        state.voiceRequests = [];
        state.voiceChatMessages = [];
      }
    },

    voiceLeft: (state) => {
      state.room = null;
      state.instance = null;
      state.role = null;

      state.chatEnabled = true;
      state.lockedStage = false;

      state.messages = [];
      state.speakingUsers = {};
      state.voiceRequests = [];
      state.voiceChatMessages = [];
    },

    voiceUserJoined: (state, action) => {
      if (!state.instance) return;

      // ✅ Safety guards
      state.instance.speakers = state.instance.speakers || [];
      state.instance.participants = state.instance.participants || [];

      const incoming = action.payload;
      const uid = String(incoming._id);

      // Check speakers first
      let user = state.instance.speakers.find(s => String(s._id) === uid);

      if (user) {
        // ✅ Preserve existing rich data, merge incoming
        Object.assign(user, {
          ...incoming,
          isConnected: true,
        });
        return;
      }

      // Check participants
      user = state.instance.participants.find(p => String(p._id) === uid);

      if (user) {
        // ✅ Preserve existing rich data, merge incoming
        Object.assign(user, {
          ...incoming,
          isConnected: true,
        });
        return;
      }

      // If truly new (rare case)
      state.instance.participants.push({
        ...incoming,
        isConnected: true,
      });
    },

    voiceUserLeft: (state, action) => {
      if (!state.instance) return;

      // ✅ Safety guards
      state.instance.speakers = state.instance.speakers || [];
      state.instance.participants = state.instance.participants || [];

      const uid = String(action.payload.userId);

      const speaker = state.instance.speakers.find(s => String(s._id) === uid);

      if (speaker) {
        speaker.isConnected = false;
      }

      const participant = state.instance.participants.find(p => String(p._id) === uid);

      if (participant) {
        participant.isConnected = false;
      }

      // ✅ Clean up speakingUsers when user leaves
      delete state.speakingUsers[uid];
    },

    voiceInstanceSynced: (state, action) => {
      const {
        instanceId,
        speakers,
        participants,
        chatEnabled,
        lockedStage,
      } = action.payload;

      if (!state.instance) return;

      state.instance.instanceId = instanceId;
      state.instance.speakers = speakers || [];
      state.instance.participants = participants || [];
      state.chatEnabled = chatEnabled ?? state.chatEnabled;
      state.lockedStage = lockedStage ?? state.lockedStage;
    },

    voiceSpeakerRequested: (state, action) => {
      if (!state.instance) return;

      const { userId, participant } = action.payload;

      const exists = state.voiceRequests.some(
        r => String(r.userId) === String(userId)
      );

      if (!exists) {
        state.voiceRequests.push({
          userId,
          participant,
        });
      }
    },

    // ✅ FIXED: Correct filtering using req.userId
    voiceSpeakerDeclined: (state, action) => {
      const userId = String(action.payload.userId);

      state.voiceRequests = state.voiceRequests.filter(
        (req) => String(req.userId) !== userId
      );
    },

    // ✅ FIXED: Correct filtering using req.userId
    voiceSpeakerApproved: (state, action) => {
      if (!state.instance) return;

      state.instance.speakers = state.instance.speakers || [];
      state.instance.participants = state.instance.participants || [];

      const userId = String(action.payload.userId);

      // 🔍 Find participant
      const participant = state.instance.participants.find(
        p => String(p._id) === userId
      );

      if (!participant) return;

      // 🟢 If already a speaker, just clear request
      const alreadySpeaker = state.instance.speakers.some(
        s => String(s._id) === userId
      );

      if (!alreadySpeaker) {
        state.instance.speakers.push(participant);
      }

      // 🧹 Clear raise hand request - FIXED filtering
      state.voiceRequests = state.voiceRequests.filter(
        (req) => String(req.userId) !== userId
      );
    },

    voiceSpeakerDemoted: (state, action) => {
      if (!state.instance) return;

      state.instance.speakers = state.instance.speakers || [];

      const userId = String(action.payload.userId);

      state.instance.speakers = state.instance.speakers.filter(
        s => String(s._id) !== userId
      );
    },

    voiceStageLocked: (state) => {
      state.lockedStage = true;
    },

    voiceStageUnlocked: (state) => {
      state.lockedStage = false;
    },

    voiceUserMuted: (state, action) => {
      if (!state.instance) return;

      state.instance.speakers = state.instance.speakers || [];
      state.instance.participants = state.instance.participants || [];

      const findUser = (list) =>
        list?.find(p => String(p._id) === String(action.payload.userId));

      let user = findUser(state.instance.participants) ||
        findUser(state.instance.speakers);

      if (user) user.isMuted = true;
    },

    voiceUserUnmuted: (state, action) => {
      if (!state.instance) return;

      state.instance.speakers = state.instance.speakers || [];
      state.instance.participants = state.instance.participants || [];

      const findUser = (list) =>
        list?.find(p => String(p._id) === String(action.payload.userId));

      let user = findUser(state.instance.participants) ||
        findUser(state.instance.speakers);

      if (user) user.isMuted = false;
    },

    voiceUserSpeaking: (state, action) => {
      state.speakingUsers[action.payload.userId] = action.payload.isSpeaking;
    },

    voiceHeartbeat: (state) => {
      state.lastHeartbeat = Date.now();
    },

    voiceChatMessageReceived: (state, action) => {
      if (!state.chatEnabled) return;

      const msg = action.payload;
      if (!msg?._id) return;

      const exists = state.messages.some(
        (m) => String(m._id) === String(msg._id)
      );

      if (!exists) {
        state.messages.push(msg);
      }
    },

    voiceChatToastReceived: (state, action) => {
      const toast = action.payload;
      if (!toast?._id) return;

      const exists = state.chatToasts.some(
        (t) => String(t._id) === String(toast._id)
      );

      if (!exists) {
        state.chatToasts.push(toast);
      }
    },

    clearVoiceChatToast: (state, action) => {
      const toastId = String(action.payload);
      state.chatToasts = state.chatToasts.filter(
        (t) => String(t._id) !== toastId
      );
    },

    voiceChatDisabled: (state) => {
      state.chatEnabled = false;
    },

    voiceChatEnabled: (state) => {
      state.chatEnabled = true;
    },

    voiceChatUserMuted: (state, action) => {
      // Optional UI flag if you want to mark muted users
    },

    voiceChatUserUnmuted: (state, action) => {
      // Optional UI flag
    },

    voiceRoomEnded: (state) => {
      state.room = null;
      state.instance = null;
      state.role = null;
      state.chatEnabled = true;
      state.lockedStage = false;
      state.messages = [];
      state.speakingUsers = {};
      state.voiceRequests = [];
      state.voiceChatMessages = [];
    },

    // ✅ FIX 1: Fixed to match dispatch payload
    voiceHostChanged: (state, action) => {
      const newHostId = action.payload.userId; // Socket dispatches { userId }
      if (state.room && newHostId) {
        state.room.host = newHostId;
      }
    },

    voiceRecordingStarted: (state) => {
      if (state.instance) {
        state.instance.recording = true;
      }
    },

    voiceRecordingReady: (state, action) => {
      if (state.instance) {
        state.instance.recording = false;
        state.instance.replayUrl = action.payload.replayUrl;
      }
    },

    // ✅ FIXED: Correct filtering using req.userId
    voiceUserRemoved: (state, action) => {
      const userId = String(action.payload.userId);

      if (state.instance) {
        state.instance.speakers = state.instance.speakers?.filter(
          s => String(s._id) !== userId
        ) || [];

        state.instance.participants = state.instance.participants?.filter(
          p => String(p._id) !== userId
        ) || [];
      }

      // FIXED: Correct filtering
      state.voiceRequests = state.voiceRequests.filter(
        (req) => String(req.userId) !== userId
      );

      // ✅ Clean up speakingUsers
      delete state.speakingUsers[userId];
    },

    // ✅ FIXED: Correct filtering using req.userId
    voiceUserBanned: (state, action) => {
      const userId = String(action.payload.userId);

      if (state.instance) {
        state.instance.speakers = state.instance.speakers?.filter(
          s => String(s._id) !== userId
        ) || [];

        state.instance.participants = state.instance.participants?.filter(
          p => String(p._id) !== userId
        ) || [];
      }

      // FIXED: Correct filtering
      state.voiceRequests = state.voiceRequests.filter(
        (req) => String(req.userId) !== userId
      );

      // ✅ Clean up speakingUsers
      delete state.speakingUsers[userId];
    },

    // ✅ FIX 2: Fixed to use existing voiceErrors field
    clearVoiceErrors: (state) => {
      state.voiceErrors = null;
    },

    clearSelectedChat: (state) => {
      state.selectedChat = null;
    },

    resetReportState: (state) => {
      state.reportLoading = false;
      state.reportSuccess = false;
    },

  },

  extraReducers: (builder) => {
    builder

      .addCase(fetchGroups.fulfilled, (s, a) => {
        s.groups = a.payload?.data || [];
      })

      .addCase(fetchGroupDetail.pending, (s) => {
        s.loadingDetail = true;
        s.error = null;
      })

      .addCase(fetchGroupDetail.fulfilled, (s, a) => {
        s.loadingDetail = false;
        s.selectedGroup = a.payload?.data || null;
      })

      .addCase(fetchGroupDetail.rejected, (s, a) => {
        s.loadingDetail = false;
        s.selectedGroup = null;
        s.error = a.payload || "Failed to load group";
      })

      .addCase(fetchChats.fulfilled, (s, a) => {
        s.chats = (a.payload?.data || []).filter((c) => c.type === "dm");
        s.chats = a.payload?.data || [];
      })

      .addCase(createOrGetDMChat.fulfilled, (s, a) => {
        const chat = a.payload;
        if (!chat || chat.type !== "dm") return;

        const exists = s.chats.find((c) => c._id === chat._id);
        if (!exists) {
          s.chats.unshift(chat);
        }
      })

      .addCase(fetchChatDetail.fulfilled, (s, a) => {
        const { chat, append } = a.payload;

        if (!s.selectedChat || append === "replace") {
          // 🔥 first load
          s.selectedChat = {
            ...chat,
            chatType: "dm",
          };
          return;
        }

        if (append === "prepend") {
          // 🔥 load older
          const existingIds = new Set(
            s.selectedChat.messages.map(m => String(m._id))
          );

          const newMsgs = chat.messages.filter(
            m => !existingIds.has(String(m._id))
          );

          s.selectedChat.messages = [
            ...newMsgs,
            ...s.selectedChat.messages,
          ];
        }

        if (append === "append") {
          // (optional future)
          s.selectedChat.messages.push(...chat.messages);
        }
      })

      .addCase(fetchGroupConversation.fulfilled, (s, a) => {
        const { chat, group, append } = a.payload;

        if (!s.selectedChat || append === "replace") {
          s.selectedChat = {
            ...chat,
            group,
            chatType: "group",
          };
          return;
        }

        const existingIds = new Set(
          s.selectedChat.messages.map(m => String(m._id))
        );

        const unique = chat.messages.filter(
          m => !existingIds.has(String(m._id))
        );

        if (append === "prepend") {
          s.selectedChat.messages = [
            ...unique,
            ...s.selectedChat.messages
          ];
        }

        if (append === "append") {
          s.selectedChat.messages.push(...unique);
        }
      })

      .addCase(sendChatMessage.fulfilled, (s, a) => {
        s.selectedChat?.messages?.push(a.payload.data);
      })

      .addCase(sendGroupMessage.fulfilled, (s, a) => {
        s.selectedChat?.messages?.push(a.payload.data);
      })

      .addCase(fetchVoiceInstance.fulfilled, (state, action) => {
        const {
          room,
          instance,
          role,
          chatEnabled,
          lockedStage,
        } = action.payload;

        state.loadingDetail = false;

        state.room = room;
        state.instance = instance;
        state.role = role;

        state.chatEnabled = chatEnabled ?? true;
        state.lockedStage = lockedStage ?? false;

        state.speakingUsers = {};
        state.voiceRequests = [];
      })

      .addCase(fetchVoiceInstance.pending, (state) => {
        state.loadingDetail = true;
        state.error = null;
      })

      .addCase(fetchVoiceInstance.rejected, (state, action) => {
        state.loadingDetail = false;
        state.error = action.payload;
      })

      .addCase(fetchVoices.pending, (s) => {
        s.loadingList = true;
      })

      .addCase(fetchVoices.fulfilled, (s, a) => {
        s.loadingList = false;
        s.voices = a.payload?.data || [];
      })

      .addCase(fetchVoices.rejected, (s, a) => {
        s.loadingList = false;
        s.voices = [];
        s.error = a.payload || "Failed to load voice rooms";
      })

      .addCase(fetchVoiceDetail.pending, (s) => {
        s.loadingDetail = true;
        s.error = null;
      })

      .addCase(fetchVoiceDetail.fulfilled, (s, a) => {
        s.loadingDetail = false;
        s.selectedVoice = a.payload?.data || null;
      })

      .addCase(fetchVoiceDetail.rejected, (s, a) => {
        s.loadingDetail = false;
        s.selectedVoice = null;
        s.error = a.payload || "Failed to load voice room";
      })

      .addCase(fetchHubs.pending, (s) => {
        s.loadingList = true;
      })

      .addCase(fetchHubs.fulfilled, (s, a) => {

        s.loadingList = false;
        s.hubs = a.payload?.data || [];
      })

      .addCase(fetchHubs.rejected, (s, a) => {

        s.loadingList = false;
        s.hubs = [];
        s.error = a.payload || "Failed to load hubs";
      })

      .addCase(fetchHubDetail.pending, (state) => {
        state.loadingDetail = true;
        state.error = null;
      })

      .addCase(fetchHubDetail.fulfilled, (state, action) => {

        state.loadingDetail = false;
        state.selectedHub = action.payload; // ✅ DIRECT HUB
      })

      .addCase(fetchHubDetail.rejected, (state, action) => {
        state.loadingDetail = false;
        state.selectedHub = null;
        state.error = action.payload || "Failed to load hub";
      })

      .addCase(createGroup.pending, (state) => {
        state.loadingDetail = true;
        state.error = null;
      })

      .addCase(createGroup.fulfilled, (state, action) => {
        state.loadingDetail = false;

        // backend returns: { success, message, data: group }
        const wrapper = action.payload;
        const group = wrapper?.data || wrapper; // fallback if service changes

        if (!group?._id) return;

        // ✅ normalize to match getGroups()
        const normalized = {
          _id: group._id,
          name: group.name,
          description: group.description,
          avatar: group.avatar,
          privacy: group.privacy,

          // in group doc: members is array of {user, joinedAt}
          membersCount: Array.isArray(group.members) ? group.members.length : 1,
          isMember: true, // creator is always a member

          // in createGroup: group.chat exists
          chatId: group.chat || null,
        };

        // ✅ insert or replace if exists
        const existsIdx = state.groups.findIndex(
          (g) => String(g._id) === String(normalized._id)
        );

        if (existsIdx >= 0) {
          state.groups[existsIdx] = { ...state.groups[existsIdx], ...normalized };
        } else {
          state.groups.unshift(normalized);
        }

        state.selectedGroup = normalized;
      })

      .addCase(createGroup.rejected, (state, action) => {
        state.loadingDetail = false;
        state.error = action.payload || "Failed to create group";
      })

      .addCase(joinGroup.fulfilled, (state, action) => {
        const payload = action.payload;
        if (!payload?._id) return;

        // 1️⃣ Update selectedGroup if open
        if (state.selectedGroup?._id === payload._id) {
          state.selectedGroup.isMember = true;
          state.selectedGroup.membersCount = payload.membersCount;
        }

        // 2️⃣ Update groups list
        state.groups = state.groups.map((group) =>
          String(group._id) === String(payload._id)
            ? {
              ...group,
              isMember: true,
              membersCount: payload.membersCount,
            }
            : group
        );
      })

      .addCase(deleteGroup.pending, (state) => {
        state.loadingDetail = true;
        state.error = null;
      })

      .addCase(deleteGroup.fulfilled, (state, action) => {
        state.loadingDetail = false;

        const { groupId } = action.payload;

        // Remove from groups list
        state.groups = state.groups.filter(
          (g) => String(g._id) !== String(groupId)
        );

        // Clear selectedGroup if open
        if (state.selectedGroup?._id === groupId) {
          state.selectedGroup = null;
        }
      })

      .addCase(deleteGroup.rejected, (state, action) => {
        state.loadingDetail = false;
        state.error = action.payload || "Failed to delete group";
      })

      .addCase(deleteChat.fulfilled, (state, action) => {
        const id = String(action.payload);

        state.chats = state.chats.filter(
          (c) => String(c._id) !== id
        );

        if (state.selectedChat?._id === id) {
          state.selectedChat = null;
        }
      })

      .addCase(generateGroupInviteLink.fulfilled, (state, action) => {
        const { inviteLink, inviteToken } = action.payload || {};

        if (state.selectedGroup) {
          state.selectedGroup.inviteLink = inviteLink;
          state.selectedGroup.inviteToken = inviteToken;
        }
      })

      .addCase(leaveHub.fulfilled, (state, action) => {
        const payload = action.payload;
        if (!payload?._id) return;

        /* =============================
           1️⃣ Update selectedHub
        ============================== */
        if (state.selectedHub?._id === payload._id) {
          state.selectedHub.isMember = false;
          state.selectedHub.membersCount = payload.membersCount;
        }

        /* =============================
           2️⃣ Update hubs list (CRITICAL)
        ============================== */
        state.hubs = state.hubs.map((hub) =>
          String(hub._id) === String(payload._id)
            ? {
              ...hub,
              isMember: false,
              membersCount: payload.membersCount,
            }
            : hub
        );
      })

      /* =====================================================
   HUB UPDATES
===================================================== */

      .addCase(fetchHubUpdates.pending, (s) => {
        s.hubUpdatesLoading = true;
      })

      .addCase(fetchHubUpdates.fulfilled, (s, a) => {
        s.hubUpdatesLoading = false;

        const { updates, page, hasMore, total, append } = a.payload;

        if (append) {
          // 🔥 prevent duplicates
          const existingIds = new Set(
            s.hubUpdates.map((u) => String(u._id))
          );

          const unique = updates.filter(
            (u) => !existingIds.has(String(u._id))
          );

          s.hubUpdates = [...s.hubUpdates, ...unique];
        } else {
          s.hubUpdates = updates;
        }

        s.hubUpdatesPage = page;
        s.hubUpdatesHasMore = hasMore;
        s.hubUpdatesTotal = total;
      })

      .addCase(fetchHubUpdates.rejected, (s) => {
        s.hubUpdatesLoading = false;
      })

      .addCase(createHubUpdate.fulfilled, (s, a) => {
        if (!a.payload?.data) return;

        const realUpdate = a.payload.data;

        // remove optimistic one (optional improvement)
        // s.hubUpdates = s.hubUpdates.filter(u => !u.pending);

        s.hubUpdates.unshift(realUpdate);
      })

      .addCase(deleteHubUpdate.fulfilled, (s, a) => {
        s.hubUpdates = s.hubUpdates.filter(
          (u) => String(u._id) !== String(a.payload.updateId)
        );
      })

      .addCase(reactHubUpdate.fulfilled, (state, action) => {
        const { updateId, reactions } = action.payload;

        // 1️⃣ Update hubUpdates list
        const item = state.hubUpdates.find(
          (u) => String(u._id) === String(updateId)
        );

        if (item) {
          item.reactions = reactions;
        }

        // 2️⃣ Also update selectedHub detail screen
        if (state.selectedHub?.updates) {
          const selectedItem = state.selectedHub.updates.find(
            (u) => String(u._id) === String(updateId)
          );

          if (selectedItem) {
            selectedItem.reactions = reactions;
          }
        }
      })

      /* =====================================================
   CREATE VOICE ROOM
===================================================== */

      .addCase(createVoiceRoom.pending, (state) => {
        state.loadingDetail = true;
        state.error = null;
      })

      .addCase(createVoiceRoom.fulfilled, (state, action) => {
        state.loadingDetail = false;

        const newVoice = action.payload;
        if (!newVoice?._id) return;

        // ✅ Add to voices list (top)
        state.voices.unshift(newVoice);

        // Optional: auto-select newly created room
        // state.selectedVoice = newVoice;
      })

      .addCase(createVoiceRoom.rejected, (state, action) => {
        state.loadingDetail = false;
        state.error = action.payload || "Failed to create room";
      })

      .addCase(deleteVoiceRoom.pending, (state) => {
        state.loadingDetail = true;
        state.error = null;
      })

      .addCase(deleteVoiceRoom.fulfilled, (state, action) => {
        state.loadingDetail = false;

        const { voiceId } = action.payload;

        // 1️⃣ Remove from voices list
        state.voices = state.voices.filter(
          (v) => String(v._id) !== String(voiceId)
        );

        // 2️⃣ If currently inside that room → fully reset session
        if (state.room?._id === voiceId) {
          state.room = null;
          state.instance = null;
          state.role = null;
          state.chatEnabled = true;
          state.lockedStage = false;
          state.messages = [];
          state.speakingUsers = {};
          state.voiceRequests = [];
          state.voiceChatMessages = [];
        }

        // 3️⃣ Clear selectedVoice if open in details screen
        if (state.selectedVoice?._id === voiceId) {
          state.selectedVoice = null;
        }
      })

      .addCase(deleteVoiceRoom.rejected, (state, action) => {
        state.loadingDetail = false;
        state.error = action.payload || "Failed to delete room";
      })


      // report
      .addCase(reportContent.pending, (state) => {
        state.reportLoading = true;
        state.reportSuccess = false;
        state.error = null;
      })

      .addCase(reportContent.fulfilled, (state) => {
        state.reportLoading = false;
        state.reportSuccess = true;
      })

      .addCase(reportContent.rejected, (state, action) => {
        state.reportLoading = false;
        state.error = action.payload || "Report failed";
      })

  },
});

export const {
  clearCommunityError,
  pushIncomingMessage,
  updateMessageReceipt,
  updateMessageReactions,
  updatePinnedMessage,

  deleteMessageForMe,
  deleteMessageForEveryone,
  updateEditedMessage,
  clearSelectedChat,
  updateBlockedUsers,
  markChatRead,

  /* VOICE */
  voiceJoined,
  voiceLeft,
  voiceUserJoined,
  voiceUserLeft,
  voiceInstanceSynced,
  voiceSpeakerRequested,
  voiceSpeakerApproved,
  voiceSpeakerDeclined,
  voiceSpeakerDemoted,
  voiceStageLocked,
  voiceStageUnlocked,
  voiceUserMuted,
  voiceUserUnmuted,
  voiceUserSpeaking,
  voiceChatMessageReceived,
  voiceChatToastReceived,
  clearVoiceChatToast,
  voiceChatDisabled,
  voiceChatEnabled,
  voiceRoomEnded,
  voiceHostChanged,
  voiceRecordingStarted,
  voiceRecordingReady,
  voiceUserRemoved,
  voiceUserBanned,
  voiceChatUserMuted,
  voiceChatUserUnmuted,
  voiceHeartbeat,
  clearVoiceErrors,

  /* HUB UPDATES */
  addHubUpdate,
  updateHubUpdateReactions,
  updatePinnedUpdate,
  removeHubUpdate,

} = communitySlice.actions;

export default communitySlice.reducer;