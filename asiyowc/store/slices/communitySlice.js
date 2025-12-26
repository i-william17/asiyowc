import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { communityService } from "../../services/community";

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

/* ===========================
   SLICE
=========================== */
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

    pushIncomingMessage: (s, a) => {
      const { chatId, message } = a.payload || {};
      if (!chatId || !message) return;
      if (s.selectedChat?._id === chatId) {
        s.selectedChat.messages.push(message);
      }
    },

    updateMessageReceipt: (s, a) => {
      const { messageId, receipt } = a.payload || {};
      const msg = s.selectedChat?.messages?.find(
        (m) => String(m._id) === String(messageId)
      );
      if (msg) Object.assign(msg, receipt);
    },

    updateMessageReactions: (s, a) => {
      const { messageId, reactions } = a.payload || {};
      const msg = s.selectedChat?.messages?.find(
        (m) => String(m._id) === String(messageId)
      );
      if (msg) msg.reactions = reactions;
    },

    togglePinMessage: (s, a) => {
      const { chatId, messageId } = a.payload || {};
      if (!s.pinnedMessages[chatId]) s.pinnedMessages[chatId] = {};
      s.pinnedMessages[chatId][messageId] =
        !s.pinnedMessages[chatId][messageId];
    },

    removeMessageForEveryone: (s, a) => {
      const { messageId } = a.payload || {};
      if (s.selectedChat) {
        s.selectedChat.messages = s.selectedChat.messages.filter(
          (m) => String(m._id) !== String(messageId)
        );
      }
    },
  },

  extraReducers: (builder) => {
    builder

      /* GROUP LIST */
      .addCase(fetchGroups.fulfilled, (s, a) => {
        s.groups = a.payload?.data || [];
      })

      /* GROUP DETAIL (✅ FIX) */
      .addCase(fetchGroupDetail.pending, (s) => {
        s.loadingDetail = true;
        s.error = null;
        s.selectedGroup = null;
      })
      .addCase(fetchGroupDetail.fulfilled, (s, a) => {
        s.loadingDetail = false;
        s.selectedGroup = a.payload?.data || null;
      })
      .addCase(fetchGroupDetail.rejected, (s, a) => {
        s.loadingDetail = false;
        s.error = a.payload || a.error.message;
      })

      /* DM LIST */
      .addCase(fetchChats.fulfilled, (s, a) => {
        s.chats = (a.payload?.data || []).filter((c) => c.type === "dm");
      })

      /* DM CHAT */
      .addCase(fetchChatDetail.fulfilled, (s, a) => {
        s.selectedChat = {
          ...a.payload.data,
          chatType: "dm",
        };
      })

      /* GROUP CHAT */
      .addCase(fetchGroupConversation.pending, (s) => {
        s.loadingDetail = true;
        s.selectedChat = null;
      })
      .addCase(fetchGroupConversation.fulfilled, (s, a) => {
        s.loadingDetail = false;
        s.selectedChat = {
          ...a.payload.chat,
          group: a.payload.group,
          chatType: "group",
        };
      })
      .addCase(fetchGroupConversation.rejected, (s, a) => {
        s.loadingDetail = false;
        s.error = a.payload;
      })

      /* SEND MESSAGES */
      .addCase(sendChatMessage.fulfilled, (s, a) => {
        s.selectedChat?.messages.push(a.payload.data);
      })
      .addCase(sendGroupMessage.fulfilled, (s, a) => {
        s.selectedChat?.messages.push(a.payload.data);
      });
  },
});

export const {
  clearCommunityError,
  pushIncomingMessage,
  updateMessageReceipt,
  updateMessageReactions,
  togglePinMessage,
  removeMessageForEveryone,
} = communitySlice.actions;

export default communitySlice.reducer;


// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import { communityService } from "../../services/community";

// /* ===========================
//    LISTS
// =========================== */
// export const fetchGroups = createAsyncThunk(
//   "community/fetchGroups",
//   async (_, { getState, rejectWithValue }) => {
//     try {
//       return await communityService.getGroups(getState().auth.token);
//     } catch (e) {
//       return rejectWithValue(e?.message || "Failed to load groups");
//     }
//   }
// );

// export const fetchHubs = createAsyncThunk(
//   "community/fetchHubs",
//   async (_, { getState, rejectWithValue }) => {
//     try {
//       return await communityService.getHubs(getState().auth.token);
//     } catch (e) {
//       return rejectWithValue(e?.message || "Failed to load hubs");
//     }
//   }
// );

// export const fetchChats = createAsyncThunk(
//   "community/fetchChats",
//   async (_, { getState, rejectWithValue }) => {
//     try {
//       return await communityService.getChats(getState().auth.token);
//     } catch (e) {
//       return rejectWithValue(e?.message || "Failed to load chats");
//     }
//   }
// );

// export const fetchVoices = createAsyncThunk(
//   "community/fetchVoices",
//   async (_, { getState, rejectWithValue }) => {
//     try {
//       return await communityService.getVoices(getState().auth.token);
//     } catch (e) {
//       return rejectWithValue(e?.message || "Failed to load rooms");
//     }
//   }
// );

// /* ===========================
//    DETAILS
// =========================== */
// export const fetchGroupDetail = createAsyncThunk(
//   "community/fetchGroupDetail",
//   async (id, { getState, rejectWithValue }) => {
//     try {
//       return await communityService.getGroupById(id, getState().auth.token);
//     } catch (e) {
//       return rejectWithValue(e?.message || "Failed to load group");
//     }
//   }
// );

// export const fetchHubDetail = createAsyncThunk(
//   "community/fetchHubDetail",
//   async (id, { getState, rejectWithValue }) => {
//     try {
//       return await communityService.getHubById(id, getState().auth.token);
//     } catch (e) {
//       return rejectWithValue(e?.message || "Failed to load hub");
//     }
//   }
// );

// export const fetchChatDetail = createAsyncThunk(
//   "community/fetchChatDetail",
//   async (id, { getState, rejectWithValue }) => {
//     try {
//       return await communityService.getChatById(id, getState().auth.token);
//     } catch (e) {
//       return rejectWithValue(e?.message || "Failed to load chat");
//     }
//   }
// );

// export const fetchVoiceDetail = createAsyncThunk(
//   "community/fetchVoiceDetail",
//   async (id, { getState, rejectWithValue }) => {
//     try {
//       return await communityService.getVoiceById(id, getState().auth.token);
//     } catch (e) {
//       return rejectWithValue(e?.message || "Failed to load room");
//     }
//   }
// );

// /* ===========================
//    JOIN / LEAVE GROUP (AUTHORITATIVE)
//    IMPORTANT:
//    - return updated group object from backend
// =========================== */
// export const joinGroup = createAsyncThunk(
//   "community/joinGroup",
//   async (groupId, { getState, rejectWithValue }) => {
//     try {
//       const res = await communityService.joinGroup(groupId, getState().auth.token);
//       return res?.data; // ✅ backend returns { success, data: updatedGroup }
//     } catch (e) {
//       return rejectWithValue(e?.message || "Failed to join group");
//     }
//   }
// );

// export const leaveGroup = createAsyncThunk(
//   "community/leaveGroup",
//   async (groupId, { getState, rejectWithValue }) => {
//     try {
//       const res = await communityService.leaveGroup(groupId, getState().auth.token);
//       return res?.data; // ✅ return updatedGroup (NOT id string)
//     } catch (e) {
//       return rejectWithValue(e?.message || "Failed to leave group");
//     }
//   }
// );

// /* ===========================
//    MESSAGES
// =========================== */
// export const sendChatMessage = createAsyncThunk(
//   "community/sendChatMessage",
//   async ({ chatId, payload }, { getState, rejectWithValue }) => {
//     try {
//       return await communityService.sendMessage(chatId, payload, getState().auth.token);
//     } catch (e) {
//       return rejectWithValue(e?.message || "Failed to send message");
//     }
//   }
// );

// /* ===========================
//    SLICE
// =========================== */
// const communitySlice = createSlice({
//   name: "community",

//   initialState: {
//     groups: [],
//     hubs: [],
//     chats: [],
//     voices: [],

//     selectedGroup: null,
//     selectedHub: null,
//     selectedChat: null,
//     selectedVoice: null,

//     joinedGroups: {},

//     loadingList: false,
//     loadingDetail: false,
//     sendingMessage: false,
//     mutatingGroup: false,
//     error: null,
//   },

//   reducers: {
//     clearCommunityError: (s) => {
//       s.error = null;
//     },

//     // OPTIONAL (keep if you want manual overrides)
//     isJoined: (s, a) => {
//       s.joinedGroups[a.payload] = true;
//     },
//     leftGroup: (s, a) => {
//       delete s.joinedGroups[a.payload];
//     },

//     pushIncomingMessage: (s, action) => {
//       const { chatId, message } = action.payload || {};
//       if (!chatId || !message) return;

//       if (s.selectedChat?._id === chatId) {
//         s.selectedChat.messages = s.selectedChat.messages || [];
//         s.selectedChat.messages.push(message);
//       }

//       const idx = s.chats.findIndex((c) => c._id === chatId);
//       if (idx !== -1) s.chats[idx].updatedAt = new Date().toISOString();
//     },
//   },

//   extraReducers: (builder) => {
//     const pendingList = (s) => {
//       s.loadingList = true;
//       s.error = null;
//     };
//     const doneList = (s) => {
//       s.loadingList = false;
//     };

//     builder
//       /* ===========================
//          LISTS
//       =========================== */
//       .addCase(fetchGroups.pending, pendingList)
//       .addCase(fetchGroups.fulfilled, (s, a) => {
//         s.loadingList = false;
//         s.groups = a.payload?.data || [];

//         // Sync joinedGroups map from backend
//         const joined = {};
//         for (const g of s.groups) {
//           if (g?.isMember) joined[g._id] = true;
//         }
//         s.joinedGroups = joined;
//       })
//       .addCase(fetchGroups.rejected, (s, a) => {
//         doneList(s);
//         s.error = a.payload || a.error.message;
//       })

//       .addCase(fetchHubs.pending, pendingList)
//       .addCase(fetchHubs.fulfilled, (s, a) => {
//         s.loadingList = false;
//         s.hubs = a.payload?.data || [];
//       })
//       .addCase(fetchHubs.rejected, (s, a) => {
//         doneList(s);
//         s.error = a.payload || a.error.message;
//       })

//       .addCase(fetchChats.pending, pendingList)
//       .addCase(fetchChats.fulfilled, (s, a) => {
//         s.loadingList = false;
//         s.chats = a.payload?.data || [];
//       })
//       .addCase(fetchChats.rejected, (s, a) => {
//         doneList(s);
//         s.error = a.payload || a.error.message;
//       })

//       .addCase(fetchVoices.pending, pendingList)
//       .addCase(fetchVoices.fulfilled, (s, a) => {
//         s.loadingList = false;
//         s.voices = a.payload?.data || [];
//       })
//       .addCase(fetchVoices.rejected, (s, a) => {
//         doneList(s);
//         s.error = a.payload || a.error.message;
//       })

//       /* ===========================
//          DETAILS
//       =========================== */
//       .addCase(fetchGroupDetail.pending, (s) => {
//         s.loadingDetail = true;
//         s.error = null;
//         s.selectedGroup = null;
//       })
//       .addCase(fetchGroupDetail.fulfilled, (s, a) => {
//         s.loadingDetail = false;
//         s.selectedGroup = a.payload?.data || null;

//         const gid = s.selectedGroup?._id;
//         if (gid) {
//           if (s.selectedGroup.isMember) s.joinedGroups[gid] = true;
//           else delete s.joinedGroups[gid];
//         }
//       })
//       .addCase(fetchGroupDetail.rejected, (s, a) => {
//         s.loadingDetail = false;
//         s.error = a.payload || a.error.message;
//       })

//       .addCase(fetchHubDetail.pending, (s) => {
//         s.loadingDetail = true;
//         s.error = null;
//         s.selectedHub = null;
//       })
//       .addCase(fetchHubDetail.fulfilled, (s, a) => {
//         s.loadingDetail = false;
//         s.selectedHub = a.payload?.data || null;
//       })
//       .addCase(fetchHubDetail.rejected, (s, a) => {
//         s.loadingDetail = false;
//         s.error = a.payload || a.error.message;
//       })

//       .addCase(fetchChatDetail.pending, (s) => {
//         s.loadingDetail = true;
//         s.error = null;
//         s.selectedChat = null;
//       })
//       .addCase(fetchChatDetail.fulfilled, (s, a) => {
//         s.loadingDetail = false;
//         s.selectedChat = a.payload?.data || null;
//       })
//       .addCase(fetchChatDetail.rejected, (s, a) => {
//         s.loadingDetail = false;
//         s.error = a.payload || a.error.message;
//       })

//       .addCase(fetchVoiceDetail.pending, (s) => {
//         s.loadingDetail = true;
//         s.error = null;
//         s.selectedVoice = null;
//       })
//       .addCase(fetchVoiceDetail.fulfilled, (s, a) => {
//         s.loadingDetail = false;
//         s.selectedVoice = a.payload?.data || null;
//       })
//       .addCase(fetchVoiceDetail.rejected, (s, a) => {
//         s.loadingDetail = false;
//         s.error = a.payload || a.error.message;
//       })

//       /* ===========================
//          JOIN GROUP
//       =========================== */
//       .addCase(joinGroup.pending, (s) => {
//         s.mutatingGroup = true;
//         s.error = null;
//       })
//       .addCase(joinGroup.fulfilled, (s, a) => {
//         s.mutatingGroup = false;

//         const joined = a.payload;
//         const gid = joined?._id;
//         if (!gid) return;

//         // membership map
//         s.joinedGroups[gid] = true;

//         // patch group list
//         s.groups = s.groups.map((g) =>
//           String(g._id) === String(gid)
//             ? { ...g, ...joined, isMember: true }
//             : g
//         );

//         // patch selectedGroup
//         if (s.selectedGroup && String(s.selectedGroup._id) === String(gid)) {
//           s.selectedGroup = { ...s.selectedGroup, ...joined, isMember: true };
//         }
//       })
//       .addCase(joinGroup.rejected, (s, a) => {
//         s.mutatingGroup = false;
//         s.error = a.payload || a.error.message;
//       })

//       /* ===========================
//          LEAVE GROUP
//       =========================== */
//       .addCase(leaveGroup.pending, (s) => {
//         s.mutatingGroup = true;
//         s.error = null;
//       })
//       .addCase(leaveGroup.fulfilled, (s, a) => {
//         s.mutatingGroup = false;

//         const left = a.payload; // ✅ updatedGroup
//         const gid = left?._id;
//         if (!gid) return;

//         delete s.joinedGroups[gid];

//         s.groups = s.groups.map((g) =>
//           String(g._id) === String(gid)
//             ? { ...g, ...left, isMember: false, chatId: null }
//             : g
//         );

//         if (s.selectedGroup && String(s.selectedGroup._id) === String(gid)) {
//           s.selectedGroup = { ...s.selectedGroup, ...left, isMember: false, chatId: null };
//         }
//       })
//       .addCase(leaveGroup.rejected, (s, a) => {
//         s.mutatingGroup = false;
//         s.error = a.payload || a.error.message;
//       })

//       /* ===========================
//          MESSAGES
//       =========================== */
//       .addCase(sendChatMessage.pending, (s) => {
//         s.sendingMessage = true;
//         s.error = null;
//       })
//       .addCase(sendChatMessage.fulfilled, (s, a) => {
//         s.sendingMessage = false;
//         const msg = a.payload?.data;
//         if (msg && s.selectedChat?.messages) s.selectedChat.messages.push(msg);
//       })
//       .addCase(sendChatMessage.rejected, (s, a) => {
//         s.sendingMessage = false;
//         s.error = a.payload || a.error.message;
//       });
//   },
// });

// export const {
//   clearCommunityError,
//   pushIncomingMessage,
//   isJoined,
//   leftGroup,
// } = communitySlice.actions;

// export default communitySlice.reducer;
