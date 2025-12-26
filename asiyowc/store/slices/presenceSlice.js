// asiyowc/store/slices/presenceSlice.js
import { createSlice } from "@reduxjs/toolkit";

/* ============================================================
   PRESENCE SLICE
   - Tracks online/offline users
   - Tracks lastSeen timestamps
   - Hydrates presence in batches (on reconnect / join)
============================================================ */

const presenceSlice = createSlice({
  name: "presence",

  initialState: {
    /**
     * online: { [userId]: boolean }
     * Example:
     * {
     *   "user123": true,
     *   "user456": false
     * }
     */
    online: {},

    /**
     * lastSeen: { [userId]: ISOString }
     * Example:
     * {
     *   "user456": "2025-12-25T14:22:10.123Z"
     * }
     */
    lastSeen: {},
  },

  reducers: {
    /* =====================================================
       USER ONLINE
       Payload:
       { userId }
    ===================================================== */
    setUserOnline: (state, action) => {
      const { userId } = action.payload || {};
      if (!userId) return;

      state.online[userId] = true;

      // When user comes online, lastSeen is no longer relevant
      if (state.lastSeen[userId]) {
        delete state.lastSeen[userId];
      }
    },

    /* =====================================================
       USER OFFLINE
       Payload:
       {
         userId,
         lastSeen?: ISOString
       }
    ===================================================== */
    setUserOffline: (state, action) => {
      const { userId, lastSeen } = action.payload || {};
      if (!userId) return;

      state.online[userId] = false;

      // Store last seen time if provided, otherwise fallback to now
      state.lastSeen[userId] =
        lastSeen || new Date().toISOString();
    },

    /* =====================================================
       HYDRATE PRESENCE (BATCH)
       Payload:
       {
         online: { [userId]: true },
         lastSeen: { [userId]: ISOString }
       }

       Used when:
       - joining chat
       - reconnecting socket
       - fetching presence list
    ===================================================== */
    hydratePresenceBatch: (state, action) => {
      const payload = action.payload || {};

      const online = payload.online || {};
      const lastSeen = payload.lastSeen || {};

      // Merge online states
      for (const userId of Object.keys(online)) {
        state.online[userId] = Boolean(online[userId]);
      }

      // Merge last seen
      for (const userId of Object.keys(lastSeen)) {
        state.lastSeen[userId] = lastSeen[userId];
      }
    },

    /* =====================================================
       CLEAR PRESENCE (OPTIONAL)
       Useful on logout or app reset
    ===================================================== */
    resetPresence: (state) => {
      state.online = {};
      state.lastSeen = {};
    },
  },
});

/* ============================================================
   EXPORT ACTIONS
============================================================ */
export const {
  setUserOnline,
  setUserOffline,
  hydratePresenceBatch,
  resetPresence,
} = presenceSlice.actions;

/* ============================================================
   EXPORT REDUCER
============================================================ */
export default presenceSlice.reducer;
