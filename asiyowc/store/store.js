import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
// import feedReducer from './slices/feedSlice';
import programsReducer from './slices/programsSlice';
import savingsReducer from './slices/savingsSlice';
import communityReducer from './slices/communitySlice';
import postReducer from './slices/postSlice';
import uiReducer from './slices/uiSlice';
import presenceReducer from './slices/presenceSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    // feed: feedReducer,
    community: communityReducer,
    programs: programsReducer,
    savings: savingsReducer,
    posts: postReducer,
    ui: uiReducer,
    presence: presenceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export default store;