import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import adminReducer from "./slices/adminSlice"
import moderationSlice from "./slices/moderationSlice";
import marketplaceSlice from "./slices/marketplaceSlice";
import savingsSlice from "./slices/savingsSlice";
import mentorsSlice from "./slices/mentorsSlice";
import eventsSlice from "./slices/eventsSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    admin: adminReducer,
    moderation: moderationSlice,
    marketplace: marketplaceSlice,
    savings: savingsSlice,
    mentors: mentorsSlice,
    events: eventsSlice,
  },
});

export default store;
