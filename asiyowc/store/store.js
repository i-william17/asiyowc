import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import feedReducer from './slices/feedSlice';
import communityReducer from './slices/communitySlice';
import programsReducer from './slices/programsSlice';
import savingsReducer from './slices/savingsSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    feed: feedReducer,
    community: communityReducer,
    programs: programsReducer,
    savings: savingsReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export default store;