import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { feedService } from '../../services/api';

export const fetchFeed = createAsyncThunk(
  'feed/fetchFeed',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const response = await feedService.getFeed(filters);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const createPost = createAsyncThunk(
  'feed/createPost',
  async (postData, { rejectWithValue }) => {
    try {
      const response = await feedService.createPost(postData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const likePost = createAsyncThunk(
  'feed/likePost',
  async (postId, { rejectWithValue }) => {
    try {
      const response = await feedService.likePost(postId);
      return { postId, likes: response.data.likes };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const savePost = createAsyncThunk(
  'feed/savePost',
  async (postId, { rejectWithValue }) => {
    try {
      const response = await feedService.savePost(postId);
      return { postId, saved: response.data.saved };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const reportPost = createAsyncThunk(
  'feed/reportPost',
  async ({ postId, reason }, { rejectWithValue }) => {
    try {
      await feedService.reportPost(postId, reason);
      return { postId };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const feedSlice = createSlice({
  name: 'feed',
  initialState: {
    posts: [],
    dailyQuote: null,
    featuredPrograms: [],
    filters: {
      category: 'all',
      sort: 'latest',
    },
    loading: false,
    error: null,
    hasMore: true,
    page: 1,
  },
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.page = 1;
      state.posts = [];
    },
    clearFeed: (state) => {
      state.posts = [];
      state.page = 1;
      state.hasMore = true;
    },
    addNewPost: (state, action) => {
      state.posts.unshift(action.payload);
    },
    updatePost: (state, action) => {
      const index = state.posts.findIndex(post => post.id === action.payload.id);
      if (index !== -1) {
        state.posts[index] = { ...state.posts[index], ...action.payload };
      }
    },
    removePost: (state, action) => {
      state.posts = state.posts.filter(post => post.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Feed
      .addCase(fetchFeed.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload.posts;
        state.dailyQuote = action.payload.dailyQuote;
        state.featuredPrograms = action.payload.featuredPrograms;
        state.hasMore = action.payload.hasMore;
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Post
      .addCase(createPost.fulfilled, (state, action) => {
        state.posts.unshift(action.payload);
      })
      // Like Post
      .addCase(likePost.fulfilled, (state, action) => {
        const { postId, likes } = action.payload;
        const post = state.posts.find(p => p.id === postId);
        if (post) {
          post.likes = likes;
        }
      })
      // Save Post
      .addCase(savePost.fulfilled, (state, action) => {
        const { postId, saved } = action.payload;
        const post = state.posts.find(p => p.id === postId);
        if (post) {
          post.saved = saved;
        }
      });
  },
});

export const { setFilters, clearFeed, addNewPost, updatePost, removePost } = feedSlice.actions;

export const selectPosts = (state) => state.feed.posts;
export const selectDailyQuote = (state) => state.feed.dailyQuote;
export const selectFeaturedPrograms = (state) => state.feed.featuredPrograms;
export const selectFeedLoading = (state) => state.feed.loading;
export const selectFeedError = (state) => state.feed.error;
export const selectFeedFilters = (state) => state.feed.filters;

export default feedSlice.reducer;