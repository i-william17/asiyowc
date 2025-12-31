// /store/slices/postSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { postService } from "../../services/post";

/* ==========================================================
   ASYNC THUNKS
========================================================== */

/* ================= FEED ================= */
export const fetchFeed = createAsyncThunk(
  "posts/fetchFeed",
  async (params = {}, thunkAPI) => {
    try {
      return await postService.getFeed(params);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch feed"
      );
    }
  }
);

/* ================= HIGHLIGHTS ================= */
export const fetchHighlights = createAsyncThunk(
  "posts/fetchHighlights",
  async (params = {}, thunkAPI) => {
    try {
      return await postService.getHighlights(params);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch highlights"
      );
    }
  }
);

/* ================= CREATE ================= */
export const createPost = createAsyncThunk(
  "posts/createPost",
  async ({ payload, onProgress }, thunkAPI) => {
    try {
      return await postService.createPost(payload, onProgress);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data || error?.message || "Failed to create post"
      );
    }
  }
);

/* ================= DELETE ================= */
export const deletePost = createAsyncThunk(
  "posts/deletePost",
  async (postId, thunkAPI) => {
    try {
      await postService.deletePost(postId);
      return postId;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to delete post"
      );
    }
  }
);

/* ================= LIKES (TOGGLE) =================
   Backend route should be: POST /posts/:postId/like
   Returns: { postId, likesCount, userHasLiked } (recommended)
==================================================== */
export const toggleLikePost = createAsyncThunk(
  "posts/toggleLikePost",
  async (postId, thunkAPI) => {
    try {
      const data = await postService.toggleLike(postId);
      // data can be: { likesCount, userHasLiked } OR { post: {...} }
      return { postId, data };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to toggle like"
      );
    }
  }
);

/* ================= COMMENTS ================= */
export const fetchComments = createAsyncThunk(
  "posts/fetchComments",
  async ({ postId, params }, thunkAPI) => {
    try {
      const res = await postService.getComments(postId, params);
      return { postId, ...res };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch comments"
      );
    }
  }
);

export const addComment = createAsyncThunk(
  "posts/addComment",
  async ({ postId, text, parentCommentId }, thunkAPI) => {
    try {
      const comment = await postService.addComment(postId, text, parentCommentId);
      return { postId, comment };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to add comment"
      );
    }
  }
);

export const editComment = createAsyncThunk(
  "posts/editComment",
  async ({ postId, commentId, text }, thunkAPI) => {
    try {
      const comment = await postService.editComment(postId, commentId, text);
      return { postId, comment };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to edit comment"
      );
    }
  }
);

export const removeComment = createAsyncThunk(
  "posts/removeComment",
  async ({ postId, commentId }, thunkAPI) => {
    try {
      await postService.removeComment(postId, commentId);
      return { postId, commentId };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to remove comment"
      );
    }
  }
);

/* ================= COMMENT LIKE (TOGGLE) =================
   Backend route should be: POST /posts/:postId/comments/:commentId/like
========================================================== */
export const toggleLikeComment = createAsyncThunk(
  "posts/toggleLikeComment",
  async ({ postId, commentId }, thunkAPI) => {
    try {
      const data = await postService.toggleLikeComment(postId, commentId);
      // expected: { commentId, likesCount, userHasLiked } OR updated comment
      return { postId, commentId, data };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to toggle comment like"
      );
    }
  }
);

/* ================= REPORT =================
   Backend route should be: POST /posts/:postId/report  body: { reason }
========================================================== */
export const reportPost = createAsyncThunk(
  "posts/reportPost",
  async ({ postId, reason }, thunkAPI) => {
    try {
      await postService.reportPost(postId, reason);
      return { postId };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to report post"
      );
    }
  }
);

/* ==========================================================
   SLICE
========================================================== */
const postSlice = createSlice({
  name: "posts",

  initialState: {
    feed: [],
    highlights: [],

    commentsByPost: {},

    loadingFeed: false,
    loadingHighlights: false,
    creatingPost: false,
    loadingComments: false,

    // optional fine-grained flags
    likingPost: false,
    likingComment: false,
    reportingPost: false,

    error: null,

    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    },
  },

  reducers: {
    resetPosts: (state) => {
      state.feed = [];
      state.pagination = {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
      };
      state.error = null;
    },

    // Optional: allow socket / optimistic updates
    patchPost: (state, action) => {
      const { postId, patch } = action.payload || {};
      if (!postId || !patch) return;

      const idx = state.feed.findIndex((p) => String(p._id) === String(postId));
      if (idx === -1) return;

      state.feed[idx] = { ...state.feed[idx], ...patch };
    },
  },

  extraReducers: (builder) => {
    builder
      /* ================= FEED ================= */
      .addCase(fetchFeed.pending, (state) => {
        state.loadingFeed = true;
        state.error = null;
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        state.loadingFeed = false;
        const { data, pagination } = action.payload || {};

        if (pagination?.page > 1) {
          const existingIds = new Set(state.feed.map((p) => String(p._id)));
          const newPosts = (data || []).filter((p) => !existingIds.has(String(p._id)));
          state.feed.push(...newPosts);
        } else {
          state.feed = data || [];
        }

        state.pagination = pagination || state.pagination;
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.loadingFeed = false;
        state.error = action.payload || action.error?.message || "Failed to fetch feed";
      })

      /* ================= HIGHLIGHTS ================= */
      .addCase(fetchHighlights.pending, (state) => {
        state.loadingHighlights = true;
      })
      .addCase(fetchHighlights.fulfilled, (state, action) => {
        state.loadingHighlights = false;
        state.highlights = action.payload?.data || [];
      })
      .addCase(fetchHighlights.rejected, (state, action) => {
        state.loadingHighlights = false;
        state.error = action.payload || action.error?.message || null;
      })

      /* ================= CREATE ================= */
      .addCase(createPost.pending, (state) => {
        state.creatingPost = true;
        state.error = null;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.creatingPost = false;
        if (action.payload) {
          state.feed.unshift(action.payload);
          state.pagination.total = (state.pagination.total || 0) + 1;
        }
      })
      .addCase(createPost.rejected, (state, action) => {
        state.creatingPost = false;
        state.error = action.payload || action.error?.message || "Failed to create post";
      })

      /* ================= DELETE ================= */
      .addCase(deletePost.pending, (state) => {
        state.error = null;
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        state.feed = state.feed.filter((p) => String(p._id) !== String(action.payload));
        state.pagination.total = Math.max((state.pagination.total || 0) - 1, 0);
      })
      .addCase(deletePost.rejected, (state, action) => {
        state.error = action.payload || action.error?.message || "Failed to delete post";
      })

      /* ================= LIKES (TOGGLE) ================= */
      .addCase(toggleLikePost.pending, (state) => {
        state.likingPost = true;
        state.error = null;
      })
      .addCase(toggleLikePost.fulfilled, (state, action) => {
        state.likingPost = false;

        const { postId, data } = action.payload || {};
        if (!postId) return;

        const post = state.feed.find((p) => String(p._id) === String(postId));
        if (!post) return;

        // Accept multiple backend response shapes
        // Shape A: { likesCount, userHasLiked }
        if (data && typeof data === "object" && ("likesCount" in data || "userHasLiked" in data)) {
          if (typeof data.likesCount === "number") post.likesCount = data.likesCount;
          if (typeof data.userHasLiked === "boolean") post.userHasLiked = data.userHasLiked;

          // Keep backward compatibility with your UI fields
          post.reactionsCount = typeof data.likesCount === "number" ? data.likesCount : post.reactionsCount;
          return;
        }

        // Shape B: full post returned
        if (data && typeof data === "object" && data._id) {
          post.userHasLiked = !!data.userHasLiked;
          post.likesCount =
            typeof data.likesCount === "number"
              ? data.likesCount
              : typeof data.reactionsCount === "number"
              ? data.reactionsCount
              : post.likesCount;

          post.reactionsCount =
            typeof data.reactionsCount === "number"
              ? data.reactionsCount
              : typeof data.likesCount === "number"
              ? data.likesCount
              : post.reactionsCount;

          return;
        }
      })
      .addCase(toggleLikePost.rejected, (state, action) => {
        state.likingPost = false;
        state.error = action.payload || action.error?.message || "Failed to toggle like";
      })

      /* ================= COMMENTS ================= */
      .addCase(fetchComments.pending, (state) => {
        state.loadingComments = true;
        state.error = null;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.loadingComments = false;
        const postId = action.payload?.postId;
        if (!postId) return;
        state.commentsByPost[postId] = action.payload?.data || [];
      })
      .addCase(fetchComments.rejected, (state, action) => {
        state.loadingComments = false;
        state.error = action.payload || action.error?.message || "Failed to fetch comments";
      })

      .addCase(addComment.fulfilled, (state, action) => {
        const { postId, comment } = action.payload || {};
        if (!postId || !comment) return;

        if (!state.commentsByPost[postId]) state.commentsByPost[postId] = [];
        state.commentsByPost[postId].unshift(comment);

        const post = state.feed.find((p) => String(p._id) === String(postId));
        if (post) {
          post.commentsCount = (post.commentsCount || 0) + 1;
        }
      })
      .addCase(addComment.rejected, (state, action) => {
        state.error = action.payload || action.error?.message || "Failed to add comment";
      })

      .addCase(editComment.fulfilled, (state, action) => {
        const { postId, comment } = action.payload || {};
        if (!postId || !comment?._id) return;

        const list = state.commentsByPost[postId] || [];
        const idx = list.findIndex((c) => String(c._id) === String(comment._id));
        if (idx !== -1) list[idx] = { ...list[idx], ...comment };
        state.commentsByPost[postId] = list;
      })
      .addCase(editComment.rejected, (state, action) => {
        state.error = action.payload || action.error?.message || "Failed to edit comment";
      })

      .addCase(removeComment.fulfilled, (state, action) => {
        const { postId, commentId } = action.payload || {};
        if (!postId || !commentId) return;

        state.commentsByPost[postId] =
          state.commentsByPost[postId]?.filter((c) => String(c._id) !== String(commentId)) || [];

        const post = state.feed.find((p) => String(p._id) === String(postId));
        if (post) {
          post.commentsCount = Math.max((post.commentsCount || 0) - 1, 0);
        }
      })
      .addCase(removeComment.rejected, (state, action) => {
        state.error = action.payload || action.error?.message || "Failed to remove comment";
      })

      /* ================= COMMENT LIKE (TOGGLE) ================= */
      .addCase(toggleLikeComment.pending, (state) => {
        state.likingComment = true;
        state.error = null;
      })
      .addCase(toggleLikeComment.fulfilled, (state, action) => {
        state.likingComment = false;

        const { postId, commentId, data } = action.payload || {};
        if (!postId || !commentId) return;

        const list = state.commentsByPost[postId] || [];
        const idx = list.findIndex((c) => String(c._id) === String(commentId));
        if (idx === -1) return;

        // If backend returns updated comment, merge it
        if (data && typeof data === "object") {
          if (data._id) {
            list[idx] = { ...list[idx], ...data };
          } else {
            // Or returns { likesCount, userHasLiked }
            if (typeof data.likesCount === "number") list[idx].likesCount = data.likesCount;
            if (typeof data.userHasLiked === "boolean") list[idx].userHasLiked = data.userHasLiked;
          }
        }

        state.commentsByPost[postId] = list;
      })
      .addCase(toggleLikeComment.rejected, (state, action) => {
        state.likingComment = false;
        state.error = action.payload || action.error?.message || "Failed to toggle comment like";
      })

      /* ================= REPORT ================= */
      .addCase(reportPost.pending, (state) => {
        state.reportingPost = true;
        state.error = null;
      })
      .addCase(reportPost.fulfilled, (state) => {
        state.reportingPost = false;
      })
      .addCase(reportPost.rejected, (state, action) => {
        state.reportingPost = false;
        state.error = action.payload || action.error?.message || "Failed to report post";
      });
  },
});

export const { resetPosts, patchPost } = postSlice.actions;
export default postSlice.reducer;
