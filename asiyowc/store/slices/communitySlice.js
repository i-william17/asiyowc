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
      return await communityService.getHubs(getState().auth.token);
    } catch (e) {
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
      return await communityService.getHubById(id, getState().auth.token);
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to load hub");
    }
  }
);

export const fetchChatDetail = createAsyncThunk(
  "community/fetchChatDetail",
  async (id, { getState, rejectWithValue }) => {
    try {
      return await communityService.getChatById(id, getState().auth.token);
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to load chat");
    }
  }
);

/* ===========================
   JOIN / LEAVE GROUP
=========================== */
export const joinGroup = createAsyncThunk(
  "community/joinGroup",
  async (groupId, { getState, rejectWithValue }) => {
    try {
      const res = await communityService.joinGroup(
        groupId,
        getState().auth.token
      );
      return res?.data;
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to join group");
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
  async (chatId, { getState, rejectWithValue }) => {
    try {
      const res = await communityService.getGroupConversationByChatId(
        chatId,
        getState().auth.token
      );
      return res.data;
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to load group conversation");
    }
  }
);

export const fetchGroupMessages = createAsyncThunk(
  "community/fetchGroupMessages",
  async ({ groupId, chatId }, { getState, rejectWithValue }) => {
    try {
      return await communityService.getGroupMessages(
        groupId,
        chatId,
        getState().auth.token
      );
    } catch (e) {
      return rejectWithValue(e.message);
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

/* ============================================================
   SLICE
============================================================ */
const communitySlice = createSlice({
  name: "community",

  initialState: {
    groups: [],
    hubs: [],
    chats: [],
    voices: [],

    selectedGroup: null,
    selectedHub: null,
    selectedChat: null,

    joinedGroups: {},

    loadingList: false,
    loadingDetail: false,
    sendingMessage: false,
    error: null,

    pinnedMessages: {},
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
    updateMessageReceipt: (s, a) => {
      const { messageId, receipt } = a.payload || {};
      const msg = s.selectedChat?.messages?.find(
        (m) => String(m._id) === String(messageId)
      );
      if (msg) Object.assign(msg, receipt);
    },

    /* =====================================================
       REACTIONS (REALTIME SAFE)
    ===================================================== */
    updateMessageReactions: (state, action) => {
      const { messageId, emoji, userId } = action.payload || {};
      if (!messageId || !emoji || !userId) return;

      const msg = state.selectedChat?.messages?.find(
        (m) => String(m._id) === String(messageId)
      );
      if (!msg) return;

      // Ensure reactions is always an array
      if (!Array.isArray(msg.reactions)) {
        msg.reactions = [];
      }

      const index = msg.reactions.findIndex(
        (r) =>
          r.emoji === emoji &&
          String(r.user?._id || r.user) === String(userId)
      );

      if (index >= 0) {
        // 🔁 Remove reaction (toggle off)
        msg.reactions.splice(index, 1);
      } else {
        // ➕ Add reaction
        msg.reactions.push({
          emoji,
          user: userId,
        });
      }
    },

    /* =====================================================
       PIN / UNPIN MESSAGE
    ===================================================== */
    togglePinMessage: (s, a) => {
      const { chatId, messageId } = a.payload || {};
      if (!chatId || !messageId) return;

      if (!s.pinnedMessages[chatId]) {
        s.pinnedMessages[chatId] = {};
      }

      s.pinnedMessages[chatId][messageId] =
        !s.pinnedMessages[chatId][messageId];
    },

    /* =====================================================
       DELETE (WHATSAPP STYLE)
    ===================================================== */
    deleteMessageForMe: (s, a) => {
      const { messageId } = a.payload || {};
      const msg = s.selectedChat?.messages?.find(
        (m) => String(m._id) === String(messageId)
      );
      if (msg) {
        msg.deletedForMe = true;
      }
    },

    deleteMessageForEveryone: (s, a) => {
      const { messageId } = a.payload || {};
      const msg = s.selectedChat?.messages?.find(
        (m) => String(m._id) === String(messageId)
      );
      if (msg) {
        msg.deletedForEveryone = true;
        msg.ciphertext = null;
        msg.iv = null;
        msg.tag = null;
      }
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
        s.selectedChat = {
          ...a.payload.data,
          chatType: "dm",
        };
      })

      .addCase(fetchGroupConversation.fulfilled, (s, a) => {
        s.selectedChat = {
          ...a.payload.chat,
          group: a.payload.group,
          chatType: "group",
        };
      })

      .addCase(sendChatMessage.fulfilled, (s, a) => {
        s.selectedChat?.messages?.push(a.payload.data);
      })

      .addCase(sendGroupMessage.fulfilled, (s, a) => {
        s.selectedChat?.messages?.push(a.payload.data);
      });
  },
});

export const {
  clearCommunityError,
  pushIncomingMessage,
  updateMessageReceipt,
  updateMessageReactions,
  togglePinMessage,
  deleteMessageForMe,
  deleteMessageForEveryone,
  updateEditedMessage,
} = communitySlice.actions;

export default communitySlice.reducer;
