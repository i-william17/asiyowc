import axios from 'axios';
import { secureStore } from './storage';
import { server } from '../server';

/* ==========================================================
   AUTH HEADER HELPER
========================================================== */
async function getAuthHeaders() {
  const token = await secureStore.getItem('token');
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/* ==========================================================
   POST SERVICE
========================================================== */
export const postService = {
  /* ======================================================
     CREATE POST
     multipart/form-data
  ====================================================== */
  async createPost(payload, onProgress) {
    const formData = new FormData();

    formData.append('type', payload.type);
    formData.append('visibility', payload.visibility);

    if (payload.content?.text) {
      formData.append('content[text]', payload.content.text);
    }

    if (payload.content?.linkUrl) {
      formData.append('content[linkUrl]', payload.content.linkUrl);
    }

    if (payload.sharedTo?.groups?.length) {
      payload.sharedTo.groups.forEach(id =>
        formData.append('sharedTo[groups][]', id)
      );
    }

    if (payload.sharedTo?.hubs?.length) {
      payload.sharedTo.hubs.forEach(id =>
        formData.append('sharedTo[hubs][]', id)
      );
    }

    if (payload.media) {
      formData.append('media', {
        uri: payload.media.uri,
        name: payload.media.name,
        type: payload.media.type
      });
    }

    const headers = await getAuthHeaders();

    const res = await axios.post(
      `${server}/posts`,
      formData,
      {
        headers,
        onUploadProgress: e => {
          if (!e.total) return;
          const percent = Math.round((e.loaded * 100) / e.total);
          onProgress?.(percent);
        }
      }
    );

    return res.data.data;
  },

  /* ======================================================
     UPDATE POST
     multipart/form-data
  ====================================================== */
  async updatePost(postId, payload = {}) {
    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      if (key === 'content' && typeof value === 'object') {
        Object.entries(value).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            formData.append(`content[${k}]`, v);
          }
        });
        return;
      }

      if (key === 'sharedTo' && typeof value === 'object') {
        if (Array.isArray(value.groups)) {
          value.groups.forEach(id => {
            formData.append('sharedTo[groups][]', id);
          });
        }
        if (Array.isArray(value.hubs)) {
          value.hubs.forEach(id => {
            formData.append('sharedTo[hubs][]', id);
          });
        }
        return;
      }

      if (key === 'media') {
        formData.append('media', {
          uri: value.uri,
          name: value.name || 'post-media',
          type: value.type || 'image/jpeg'
        });
        return;
      }

      formData.append(key, value);
    });

    const headers = await getAuthHeaders();

    const res = await axios.put(
      `${server}/posts/${postId}`,
      formData,
      { headers }
    );

    return res.data.data;
  },

  /* ======================================================
     DELETE POST
  ====================================================== */
  async deletePost(postId) {
    const headers = await getAuthHeaders();

    const res = await axios.delete(
      `${server}/posts/${postId}`,
      { headers }
    );

    return res.data;
  },

  /* ======================================================
     COMMUNITY FEED
  ====================================================== */
  async getFeed(params = {}) {
    const headers = await getAuthHeaders();

    const res = await axios.get(
      `${server}/posts/feed`,
      { params, headers }
    );

    return res.data;
  },

  /* ======================================================
     PUBLIC HIGHLIGHTS (HOME SAFE)
  ====================================================== */
  async getHighlights(params = {}) {
    const headers = await getAuthHeaders();

    const res = await axios.get(
      `${server}/posts/highlights`,
      { params, headers }
    );

    return res.data;
  },

  /* ======================================================
     GET SINGLE POST
  ====================================================== */
  async getPostById(postId) {
    const headers = await getAuthHeaders();

    const res = await axios.get(
      `${server}/posts/${postId}`,
      { headers }
    );

    return res.data.data;
  },

  /* ======================================================
     COMMENTS
  ====================================================== */
  async getComments(postId, params = {}) {
    const headers = await getAuthHeaders();

    const res = await axios.get(
      `${server}/posts/${postId}/comments`,
      { params, headers }
    );

    return res.data;
  },

  async addComment(postId, text, parentCommentId = null) {
    const headers = await getAuthHeaders();

    const res = await axios.post(
      `${server}/posts/${postId}/comments`,
      { text, parentCommentId },
      { headers }
    );

    return res.data.data;
  },

  async editComment(postId, commentId, text) {
    const headers = await getAuthHeaders();

    const res = await axios.put(
      `${server}/posts/${postId}/comments/${commentId}`,
      { text },
      { headers }
    );

    return res.data.data;
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
     SHARING
  ====================================================== */
  async sharePost(postId, payload) {
    const headers = await getAuthHeaders();

    const res = await axios.post(
      `${server}/posts/${postId}/share`,
      payload,
      { headers }
    );

    return res.data.data;
  },

  async unsharePost(postId, payload) {
    const headers = await getAuthHeaders();

    const res = await axios.post(
      `${server}/posts/${postId}/unshare`,
      payload,
      { headers }
    );

    return res.data.data;
  },

  /* ======================================================
     REACTIONS
  ====================================================== */
  async react(postId, emoji) {
    const headers = await getAuthHeaders();

    const res = await axios.post(
      `${server}/posts/${postId}/react`,
      { emoji },
      { headers }
    );

    return res.data.data;
  },

  async unreact(postId, emoji) {
    const headers = await getAuthHeaders();

    const res = await axios.post(
      `${server}/posts/${postId}/unreact`,
      { emoji },
      { headers }
    );

    return res.data.data;
  }
};
