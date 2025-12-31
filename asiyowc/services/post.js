// /services/post.js
import axios from "axios";
import { secureStore } from "./storage";
import { server } from "../server";
import { Platform } from "react-native";

/* ==========================================================
   AUTH HEADER HELPER
========================================================== */
async function getAuthHeaders(extra = {}) {
  const token = await secureStore.getItem("token");
  const headers = { ...extra };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/* ==========================================================
   FORM DATA HELPERS (STRICT)
========================================================== */
function appendIfDefined(formData, key, value) {
  if (value === undefined || value === null) return;
  if (typeof value === "string" && value.trim() === "") return;
  formData.append(key, value);
}

function appendArray(formData, key, arr = []) {
  if (!Array.isArray(arr) || arr.length === 0) return;
  arr.forEach((v) => {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      formData.append(key, v);
    }
  });
}

async function fileToBlob(uri) {
  const response = await fetch(uri);
  return await response.blob();
}

async function appendMedia(formData, media) {
  if (!media) return;

  // media shape expected:
  // { uri, name, type } for RN
  // { uri, name } for web (type can be inferred)
  if (Platform.OS === "web") {
    const blob = await fileToBlob(media.uri);
    formData.append("media", blob, media.name || `upload-${Date.now()}`);
    return;
  }

  formData.append("media", {
    uri: media.uri,
    name: media.name || `upload-${Date.now()}`,
    type: media.type || "image/jpeg",
  });
}

/* ==========================================================
   POST SERVICE (AUTHORITATIVE)
========================================================== */
export const postService = {
  /* ======================================================
     CREATE POST (multipart/form-data)
     payload shape:
     {
       type, visibility,
       content: { text, linkUrl, category? },
       sharedTo?: { groups: [], hubs: [] },
       media?: { uri, name, type }
     }
  ====================================================== */
  async createPost(payload, onProgress) {
    const formData = new FormData();

    appendIfDefined(formData, "type", payload?.type || "text");
    appendIfDefined(formData, "visibility", payload?.visibility || "public");

    // content
    appendIfDefined(formData, "content[text]", payload?.content?.text);
    appendIfDefined(formData, "content[linkUrl]", payload?.content?.linkUrl);
    appendIfDefined(formData, "content[category]", payload?.content?.category);

    // sharedTo (bracket style to match backend normalizer)
    appendArray(
      formData,
      "sharedTo[groups][]",
      payload?.sharedTo?.groups || []
    );
    appendArray(formData, "sharedTo[hubs][]", payload?.sharedTo?.hubs || []);

    // media
    await appendMedia(formData, payload?.media);

    const headers = await getAuthHeaders({
      "Content-Type": "multipart/form-data",
    });

    const res = await axios.post(`${server}/posts`, formData, {
      headers,
      onUploadProgress: (e) => {
        if (!e?.total) return;
        const percent = Math.round((e.loaded * 100) / e.total);
        onProgress?.(percent);
      },
    });

    return res.data?.data;
  },

  /* ======================================================
     UPDATE POST (multipart/form-data)
     payload can include:
     { type, visibility, content: {...}, sharedTo: {...}, media }
  ====================================================== */
  async updatePost(postId, payload = {}) {
    const formData = new FormData();

    // top-level fields
    appendIfDefined(formData, "type", payload.type);
    appendIfDefined(formData, "visibility", payload.visibility);

    // content object -> content[...]
    if (payload.content && typeof payload.content === "object") {
      Object.entries(payload.content).forEach(([k, v]) => {
        appendIfDefined(formData, `content[${k}]`, v);
      });
    }

    // sharedTo object -> sharedTo[groups][], sharedTo[hubs][]
    if (payload.sharedTo && typeof payload.sharedTo === "object") {
      appendArray(
        formData,
        "sharedTo[groups][]",
        Array.isArray(payload.sharedTo.groups) ? payload.sharedTo.groups : []
      );
      appendArray(
        formData,
        "sharedTo[hubs][]",
        Array.isArray(payload.sharedTo.hubs) ? payload.sharedTo.hubs : []
      );
    }

    // media
    if (payload.media) {
      await appendMedia(formData, payload.media);
    }

    const headers = await getAuthHeaders({
      "Content-Type": "multipart/form-data",
    });

    const res = await axios.put(`${server}/posts/${postId}`, formData, {
      headers,
    });

    return res.data?.data;
  },

  /* ======================================================
     DELETE POST
  ====================================================== */
  async deletePost(postId) {
    const headers = await getAuthHeaders();
    const res = await axios.delete(`${server}/posts/${postId}`, { headers });
    return res.data;
  },

  /* ======================================================
     COMMUNITY FEED
  ====================================================== */
  async getFeed(params = {}) {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${server}/posts/feed`, { params, headers });
    return res.data;
  },

  /* ======================================================
     PUBLIC HIGHLIGHTS
  ====================================================== */
  async getHighlights(params = {}) {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${server}/posts/highlights`, {
      params,
      headers,
    });
    return res.data;
  },

  /* ======================================================
     GET SINGLE POST
  ====================================================== */
  async getPostById(postId) {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${server}/posts/${postId}`, { headers });
    return res.data?.data;
  },

  /* ======================================================
     LIKES (INSTAGRAM-STYLE TOGGLE)
     POST /posts/:postId/like
     returns: { likesCount, userHasLiked } or full post (depends on controller)
  ====================================================== */
  async toggleLike(postId) {
    const headers = await getAuthHeaders();
    const res = await axios.post(`${server}/posts/${postId}/like`, {}, { headers });
    return res.data?.data;
  },

  /* ======================================================
     COMMENTS
  ====================================================== */
  async getComments(postId, params = {}) {
    const headers = await getAuthHeaders();
    const res = await axios.get(`${server}/posts/${postId}/comments`, {
      params,
      headers,
    });
    return res.data; // { success, data, pagination }
  },

  async addComment(postId, text, parentCommentId = null) {
    const headers = await getAuthHeaders();
    const res = await axios.post(
      `${server}/posts/${postId}/comments`,
      { text, parentCommentId },
      { headers }
    );
    return res.data?.data; // created comment
  },

  async editComment(postId, commentId, text) {
    const headers = await getAuthHeaders();
    const res = await axios.put(
      `${server}/posts/${postId}/comments/${commentId}`,
      { text },
      { headers }
    );
    return res.data?.data;
  },

  async removeComment(postId, commentId) {
    const headers = await getAuthHeaders();
    const res = await axios.delete(
      `${server}/posts/${postId}/comments/${commentId}`,
      { headers }
    );
    return res.data;
  },

  /* ======================================================
     COMMENT LIKES (TOGGLE)
     POST /posts/:postId/comments/:commentId/like
  ====================================================== */
  async toggleLikeComment(postId, commentId) {
    const headers = await getAuthHeaders();
    const res = await axios.post(
      `${server}/posts/${postId}/comments/${commentId}/like`,
      {},
      { headers }
    );
    return res.data?.data;
  },

  /* ======================================================
     SHARING
  ====================================================== */
  async sharePost(postId, payload) {
    const headers = await getAuthHeaders();
    const res = await axios.post(`${server}/posts/${postId}/share`, payload, {
      headers,
    });
    return res.data?.data;
  },

  async unsharePost(postId, payload) {
    const headers = await getAuthHeaders();
    const res = await axios.post(`${server}/posts/${postId}/unshare`, payload, {
      headers,
    });
    return res.data?.data;
  },

  /* ======================================================
     REPORT POST
     POST /posts/:postId/report
     payload: { reason }
  ====================================================== */
  async reportPost(postId, reason) {
    const headers = await getAuthHeaders();
    const res = await axios.post(
      `${server}/posts/${postId}/report`,
      { reason },
      { headers }
    );
    return res.data?.data;
  },

  /* ======================================================
     (DEPRECATED) REACTIONS (REMOVE THESE CALLS IN APP)
     Kept here ONLY to avoid breaking imports while you refactor.
     Your new routes are /like, not /react.
  ====================================================== */
  async react(postId, emoji) {
    const headers = await getAuthHeaders();
    const res = await axios.post(
      `${server}/posts/${postId}/react`,
      { emoji },
      { headers }
    );
    return res.data?.data;
  },

  async unreact(postId, emoji) {
    const headers = await getAuthHeaders();
    const res = await axios.post(
      `${server}/posts/${postId}/unreact`,
      { emoji },
      { headers }
    );
    return res.data?.data;
  },
};
