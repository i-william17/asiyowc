// services/community.js
import { server } from "../server";

/* ============================================================
   HELPERS (STRICT & SAFE)
============================================================ */

const normalizeId = (v) =>
  typeof v === "object" && v !== null ? v._id || v.id : v;

const normalizeIds = (arr = []) =>
  Array.isArray(arr) ? arr.map(normalizeId).filter(Boolean) : [];

const headers = (token) => {
  if (!token) throw new Error("Auth token missing");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const json = async (res) => {
  let data = {};
  try {
    data = await res.json();
  } catch (_) {}

  if (!res.ok) {
    throw new Error(
      data?.message || data?.error || `Request failed (${res.status})`
    );
  }

  return data;
};

/* ============================================================
   COMMUNITY SERVICE (AUTHORITATIVE)
============================================================ */

export const communityService = {
  /* ============================================================
     GROUPS
  ============================================================ */

  getGroups: (token) =>
    fetch(`${server}/community/groups`, {
      headers: headers(token),
    }).then(json),

  getGroupById: (groupId, token) => {
    const id = normalizeId(groupId);
    if (!id) throw new Error("Invalid group id");

    return fetch(`${server}/community/groups/${id}`, {
      headers: headers(token),
    }).then(json);
  },

  joinGroup: (groupId, token) => {
    const id = normalizeId(groupId);
    if (!id) throw new Error("Invalid group id");

    return fetch(`${server}/community/groups/${id}/join`, {
      method: "POST",
      headers: headers(token),
    }).then(json);
  },

  leaveGroup: (groupId, token) => {
    const id = normalizeId(groupId);
    if (!id) throw new Error("Invalid group id");

    return fetch(`${server}/community/groups/${id}/leave`, {
      method: "POST",
      headers: headers(token),
    }).then(json);
  },

  updateGroup: (groupId, payload, token) => {
    const id = normalizeId(groupId);
    if (!id) throw new Error("Invalid group id");

    return fetch(`${server}/community/groups/${id}`, {
      method: "PUT",
      headers: headers(token),
      body: JSON.stringify(payload || {}),
    }).then(json);
  },

  /* ============================================================
     GROUP CHAT (🔥 FIXED + ALIGNED)
  ============================================================ */

  /**
   * ✅ USED BY fetchGroupConversation(chatId)
   * Backend returns: { group, chat }
   */
  getGroupConversationByChatId: (chatId, token) => {
    const id = normalizeId(chatId);
    if (!id) throw new Error("Invalid chat id");

    return fetch(`${server}/community/groups/chat/${id}`, {
      headers: headers(token),
    }).then(json);
  },

  getGroupMessages: (groupId, chatId, token, page = 1, limit = 20) => {
    const gid = normalizeId(groupId);
    const cid = normalizeId(chatId);
    if (!gid || !cid) throw new Error("Invalid group/chat id");

    return fetch(
      `${server}/community/groups/${gid}/chat/${cid}/messages?page=${page}&limit=${limit}`,
      { headers: headers(token) }
    ).then(json);
  },

  sendGroupMessage: (groupId, chatId, payload, token) => {
    const gid = normalizeId(groupId);
    const cid = normalizeId(chatId);
    if (!gid || !cid) throw new Error("Invalid group/chat id");

    if (!payload?.ciphertext || !payload?.iv || !payload?.tag) {
      throw new Error("Encrypted message payload required");
    }

    return fetch(
      `${server}/community/groups/${gid}/chat/${cid}/messages`,
      {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(payload),
      }
    ).then(json);
  },

  deleteGroupMessage: (groupId, chatId, messageId, token) => {
    const gid = normalizeId(groupId);
    const cid = normalizeId(chatId);
    const mid = normalizeId(messageId);
    if (!gid || !cid || !mid) throw new Error("Invalid ids");

    return fetch(
      `${server}/community/groups/${gid}/chat/${cid}/messages/${mid}`,
      {
        method: "DELETE",
        headers: headers(token),
      }
    ).then(json);
  },

  /* ============================================================
     DM CHAT (UNCHANGED)
  ============================================================ */

  getChats: (token) =>
    fetch(`${server}/community/chats`, {
      headers: headers(token),
    }).then(json),

  getChatById: (chatId, token) => {
    const id = normalizeId(chatId);
    if (!id) throw new Error("Invalid chat id");

    return fetch(`${server}/community/chats/${id}`, {
      headers: headers(token),
    }).then(json);
  },

  createChat: (payload, token) => {
    if (!payload?.participants?.length) {
      throw new Error("Chat participants required");
    }

    const cleanPayload = {
      ...payload,
      participants: normalizeIds(payload.participants),
    };

    return fetch(`${server}/community/chats`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify(cleanPayload),
    }).then(json);
  },

  sendMessage: (chatId, payload, token) => {
    const id = normalizeId(chatId);
    if (!id) throw new Error("Invalid chat id");

    if (!payload?.ciphertext || !payload?.iv || !payload?.tag) {
      throw new Error("Encrypted message payload required");
    }

    return fetch(`${server}/community/chats/${id}/messages`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify(payload),
    }).then(json);
  },

  /* ============================================================
     HUBS
  ============================================================ */

  getHubs: (token) =>
    fetch(`${server}/community/hubs`, {
      headers: headers(token),
    }).then(json),

  getHubById: (hubId, token) => {
    const id = normalizeId(hubId);
    if (!id) throw new Error("Invalid hub id");

    return fetch(`${server}/community/hubs/${id}`, {
      headers: headers(token),
    }).then(json);
  },

  joinHub: (hubId, token) => {
    const id = normalizeId(hubId);
    if (!id) throw new Error("Invalid hub id");

    return fetch(`${server}/community/hubs/${id}/join`, {
      method: "POST",
      headers: headers(token),
    }).then(json);
  },

  leaveHub: (hubId, token) => {
    const id = normalizeId(hubId);
    if (!id) throw new Error("Invalid hub id");

    return fetch(`${server}/community/hubs/${id}/leave`, {
      method: "POST",
      headers: headers(token),
    }).then(json);
  },

  updateHub: (hubId, payload, token) => {
    const id = normalizeId(hubId);
    if (!id) throw new Error("Invalid hub id");

    return fetch(`${server}/community/hubs/${id}`, {
      method: "PUT",
      headers: headers(token),
      body: JSON.stringify(payload || {}),
    }).then(json);
  },

  /* ============================================================
     VOICE
  ============================================================ */

  getVoices: (token) =>
    fetch(`${server}/community/voice`, {
      headers: headers(token),
    }).then(json),

  getVoiceById: (voiceId, token) => {
    const id = normalizeId(voiceId);
    if (!id) throw new Error("Invalid voice id");

    return fetch(`${server}/community/voice/${id}`, {
      headers: headers(token),
    }).then(json);
  },

  updateVoice: (voiceId, payload, token) => {
    const id = normalizeId(voiceId);
    if (!id) throw new Error("Invalid voice id");

    return fetch(`${server}/community/voice/${id}`, {
      method: "PUT",
      headers: headers(token),
      body: JSON.stringify(payload || {}),
    }).then(json);
  },

  addVoiceInstance: (voiceId, payload, token) => {
    const id = normalizeId(voiceId);
    if (!id) throw new Error("Invalid voice id");

    return fetch(`${server}/community/voice/${id}/instances`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify(payload || {}),
    }).then(json);
  },
};
