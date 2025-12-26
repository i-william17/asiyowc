import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { postService } from '../../services/post';

/* ==========================================================
   ASYNC THUNKS
========================================================== */
export const fetchFeed = createAsyncThunk(
  'posts/fetchFeed',
  async (params = {}, thunkAPI) => {
    try {
      return await postService.getFeed(params);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch feed'
      );
    }
  }
);

export const fetchHighlights = createAsyncThunk(
  'posts/fetchHighlights',
  async (params = {}, thunkAPI) => {
    try {
      return await postService.getHighlights(params);
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch highlights'
      );
    }
  }
);

export const createPost = createAsyncThunk(
  'posts/createPost',
  async ({ payload, onProgress }, thunkAPI) => {
    try {
      return await postService.createPost(payload, onProgress);
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  }
);


export const deletePost = createAsyncThunk(
  'posts/deletePost',
  async (postId, thunkAPI) => {
    try {
      await postService.deletePost(postId);
      return postId;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to delete post'
      );
    }
  }
);

export const likePost = createAsyncThunk(
  'posts/like',
  async (postId, thunkAPI) => {
    return await postService.react(postId, 'like');
  }
);


/* ==========================================================
   SLICE
========================================================== */
const postSlice = createSlice({
  name: 'posts',

  initialState: {
    feed: [],
    highlights: [],

    loadingFeed: false,
    loadingHighlights: false,
    creatingPost: false,

    error: null,

    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0
    }
  },

  reducers: {
    resetPosts: state => {
      state.feed = [];
      state.pagination = {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      };
      state.error = null;
    }
  },

  extraReducers: builder => {
    builder

      /* ================= FEED ================= */
      .addCase(fetchFeed.pending, state => {
        state.loadingFeed = true;
        state.error = null;
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        state.loadingFeed = false;

        const { data, pagination } = action.payload;

        // Append if paginating, replace if first page
        if (pagination.page > 1) {
          const existingIds = new Set(state.feed.map(p => p._id));
          const newPosts = data.filter(p => !existingIds.has(p._id));
          state.feed.push(...newPosts);
        } else {
          state.feed = data;
        }

        state.pagination = pagination;
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.loadingFeed = false;
        state.error = action.payload;
      })

      /* =============== HIGHLIGHTS ============== */
      .addCase(fetchHighlights.pending, state => {
        state.loadingHighlights = true;
        state.error = null;
      })
      .addCase(fetchHighlights.fulfilled, (state, action) => {
        state.loadingHighlights = false;
        state.highlights = action.payload.data;
      })
      .addCase(fetchHighlights.rejected, (state, action) => {
        state.loadingHighlights = false;
        state.error = action.payload;
      })

      /* =============== CREATE POST ============== */
      .addCase(createPost.pending, state => {
        state.creatingPost = true;
        state.error = null;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.creatingPost = false;

        const exists = state.feed.some(p => p._id === action.payload._id);
        if (!exists) {
          state.feed.unshift(action.payload);
          state.pagination.total += 1;
        }
      })
      .addCase(createPost.rejected, (state, action) => {
        state.creatingPost = false;
        state.error = action.payload;
      })

      /* =============== DELETE POST ============== */
      .addCase(deletePost.fulfilled, (state, action) => {
        state.feed = state.feed.filter(p => p._id !== action.payload);
        state.pagination.total = Math.max(state.pagination.total - 1, 0);
      });
  }
});

export const { resetPosts } = postSlice.actions;
export default postSlice.reducer;
