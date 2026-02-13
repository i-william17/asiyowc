import { configureStore, combineReducers } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";

/* =====================================================
   IMPORT SLICES
===================================================== */

import authReducer from "./slices/authSlice";
import userReducer from "./slices/userSlice";
import programsReducer from "./slices/programsSlice";
import savingsReducer from "./slices/savingsSlice";
import communityReducer from "./slices/communitySlice";
import postReducer from "./slices/postSlice";
import uiReducer from "./slices/uiSlice";
import presenceReducer from "./slices/presenceSlice";
import legacyReducer from "./slices/legacySlice";
import eventReducer from "./slices/eventSlice";
import mentorshipReducer from "./slices/mentorshipSlice";
import wellnessReducer from "./slices/wellnessSlice";
import marketplaceReducer from "./slices/marketplaceSlice";
import cartReducer from "./slices/cartSlice";

/* =====================================================
   PERSIST CONFIG (ONLY CART)
===================================================== */

const cartPersistConfig = {
  key: "cart",
  storage: AsyncStorage,
  whitelist: ["items"], // only persist cart items
};

/* =====================================================
   ROOT REDUCER
===================================================== */

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  community: communityReducer,
  programs: programsReducer,
  savings: savingsReducer,
  posts: postReducer,
  ui: uiReducer,
  presence: presenceReducer,
  legacy: legacyReducer,
  events: eventReducer,
  mentorship: mentorshipReducer,
  wellness: wellnessReducer,
  marketplace: marketplaceReducer,

  // 👇 ONLY THIS IS PERSISTED
  cart: persistReducer(cartPersistConfig, cartReducer),
});

/* =====================================================
   STORE
===================================================== */

export const store = configureStore({
  reducer: rootReducer,

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          FLUSH,
          REHYDRATE,
          PAUSE,
          PERSIST,
          PURGE,
          REGISTER,
        ],
      },
    }),
});

/* =====================================================
   PERSISTOR
===================================================== */

export const persistor = persistStore(store);

export default store;
