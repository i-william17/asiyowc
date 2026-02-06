// asiyowc/hooks/useCommunitySocket.js
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { connectSocket } from "../services/socket";

import {
  setUserOnline,
  setUserOffline,
  hydratePresenceBatch,
} from "../store/slices/presenceSlice";

import {
  pushIncomingMessage,
  // ✅ You MUST have these in your communitySlice:
  // - updateMessageReactions
  // - markMessageDeleted
  // If you don’t yet, I’ll give you exact reducers next.
  updateMessageReactions,
  markMessageDeleted,
  updatePinnedMessage,
} from "../store/slices/communitySlice";

/* ============================================================
   COMMUNITY SOCKET HOOK (FIXED)
   - Single connection
   - No duplicate listeners
   - Safe across Fast Refresh
   - Presence + messages + group messages
   - Reaction + delete realtime
============================================================ */

export default function useCommunitySocket() {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);

  const socketRef = useRef(null);
  const bootedRef = useRef(false);

  useEffect(() => {
    // If token is missing, do nothing.
    // Logout flow should explicitly disconnect socket elsewhere.
    if (!token) return;

    // ✅ Prevent double-binding listeners
    if (bootedRef.current) return;
    bootedRef.current = true;

    /* =====================================================
       CONNECT (singleton)
    ===================================================== */
    const socket = connectSocket(token);
    socketRef.current = socket;

    /* =====================================================
       SOCKET CONNECT
    ===================================================== */
    const onConnect = () => {
      // Join all chats (DM rooms)
      socket.emit("chat:joinAll", {}, () => { });

      // ✅ Hydrate presence (your backend supports presence:hydrate via callback)
      socket.emit("presence:hydrate", {}, (resp) => {
        const data = resp?.data?.online ? resp.data : resp?.data?.data;
        // expected: { online: { userId: true }, lastSeen?: { userId: iso } }
        if (resp?.success && data) {
          dispatch(
            hydratePresenceBatch({
              online: data.online || {},
              lastSeen: data.lastSeen || {},
            })
          );
        }
      });
    };

    /* =====================================================
       PRESENCE EVENTS (backend emits user:online/offline)
    ===================================================== */
    const onUserOnline = (payload = {}) => {
      const userId = payload.userId || payload.id;
      if (!userId) return;
      dispatch(setUserOnline({ userId }));
    };

    const onUserOffline = (payload = {}) => {
      const userId = payload.userId || payload.id;
      if (!userId) return;

      dispatch(
        setUserOffline({
          userId,
          lastSeen: payload.lastSeen || new Date().toISOString(),
        })
      );
    };

    /* =====================================================
       INCOMING MESSAGES (DM)
       backend emits: message:new { chatId, message }
    ===================================================== */
    const onIncomingMessage = (payload = {}) => {
      const { chatId, message } = payload || {};
      if (!chatId || !message) return;
      dispatch(pushIncomingMessage({ chatId, message }));
    };

    /* =====================================================
       INCOMING GROUP MESSAGES
       backend emits: group:message:new { groupId, chatId, message }
    ===================================================== */
    const onIncomingGroupMessage = (payload = {}) => {
      const { chatId, message } = payload || {};
      if (!chatId || !message) return;
      dispatch(pushIncomingMessage({ chatId, message }));
    };

    /* =====================================================
       REACTIONS REALTIME
       backend emits: message:reaction:update { chatId, message }
    ===================================================== */
    const onReactionUpdate = (payload = {}) => {
      const { chatId, message } = payload || {};
      if (!chatId || !message) return;
      dispatch(updateMessageReactions({ chatId, message }));
    };

    socket.on("message:reaction:update", onReactionUpdate);

    /* =====================================================
       PIN REALTIME
       backend emits: message:pin:update { chatId, pinnedMessage }
    ===================================================== */
    const onPinUpdate = ({ chatId, pinnedMessage }) => {
      dispatch(
        updatePinnedMessage({
          chatId,
          pinnedMessage,
        })
      );
    };

    socket.on("message:pin:update", onPinUpdate);

    /* =====================================================
       DELETE REALTIME
       backend emits: message:deleted { chatId, messageId, mode }
    ===================================================== */
    const onMessageDeleted = (payload = {}) => {
      const { chatId, messageId, mode } = payload || {};
      if (!chatId || !messageId) return;
      dispatch(markMessageDeleted({ chatId, messageId, mode }));
    };

    /* =====================================================
       REGISTER LISTENERS (AUTHORITATIVE)
    ===================================================== */
    socket.on("connect", onConnect);

    // Presence from backend/presence.js
    socket.on("user:online", onUserOnline);
    socket.on("user:offline", onUserOffline);

    // DM messages
    socket.on("message:new", onIncomingMessage);

    // Group messages (emitted by controller)
    socket.on("group:message:new", onIncomingGroupMessage);

    // Reactions + delete realtime (controller emits these)
    socket.on("message:reaction:update", onReactionUpdate);
    socket.on("message:deleted", onMessageDeleted);

    /* =====================================================
       CLEANUP
       ✅ Remove listeners only
       ❌ Do NOT disconnect socket here (prevents killing realtime)
    ===================================================== */
    return () => {
      try {
        socket.off("connect", onConnect);

        socket.off("user:online", onUserOnline);
        socket.off("user:offline", onUserOffline);

        socket.off("message:new", onIncomingMessage);
        socket.off("group:message:new", onIncomingGroupMessage);

        socket.off("message:reaction:update", onReactionUpdate);
        socket.off("message:pin:update", onPinUpdate);

        socket.off("message:deleted", onMessageDeleted);
      } catch { }

      socketRef.current = null;
      bootedRef.current = false;
    };
  }, [token, dispatch]);
}
