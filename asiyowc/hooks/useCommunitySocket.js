// asiyowc/hooks/useCommunitySocket.js
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  connectSocket,
  disconnectSocket,
} from "../services/socket";

import {
  setUserOnline,
  setUserOffline,
  hydratePresenceBatch,
} from "../store/slices/presenceSlice";

import { pushIncomingMessage } from "../store/slices/communitySlice";

/* ============================================================
   COMMUNITY SOCKET HOOK
   - Global socket lifecycle
   - Presence (online / offline / lastSeen)
   - Incoming messages (group + DM)
   - Safe reconnect handling
============================================================ */

export default function useCommunitySocket() {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);

  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    /* =====================================================
       CONNECT
    ===================================================== */
    const socket = connectSocket(token);
    socketRef.current = socket;

    /* =====================================================
       SOCKET CONNECT
    ===================================================== */
    const onConnect = () => {
      // Optional global join (backend already supports this)
      socket.emit("chat:joinAll", {}, () => {});
    };

    /* =====================================================
       PRESENCE EVENTS
    ===================================================== */

    // Single user online
    const onUserOnline = (payload = {}) => {
      const userId = payload.userId || payload.id;
      if (!userId) return;

      dispatch(setUserOnline({ userId }));
    };

    // Single user offline
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

    // Batch presence list (on join / reconnect)
    const onPresenceList = (payload = {}) => {
      const users =
        payload.users ||
        payload.onlineUsers ||
        payload.members ||
        [];

      if (!Array.isArray(users)) return;

      const online = {};
      const lastSeen = {};

      users.forEach((u) => {
        const id =
          u?.userId ||
          u?._id ||
          u?.id ||
          u;

        if (!id) return;

        if (
          u?.online === true ||
          u?.status === "online"
        ) {
          online[id] = true;
        } else {
          lastSeen[id] =
            u?.lastSeen || new Date().toISOString();
        }
      });

      dispatch(
        hydratePresenceBatch({
          online,
          lastSeen,
        })
      );
    };

    /* =====================================================
       INCOMING MESSAGES
    ===================================================== */
    const onIncomingMessage = (payload = {}) => {
      const { chatId, message } = payload || {};
      if (!chatId || !message) return;

      dispatch(pushIncomingMessage({ chatId, message }));
    };

    /* =====================================================
       REGISTER LISTENERS
    ===================================================== */
    socket.on("connect", onConnect);

    // Presence (support all common variants)
    socket.on("presence:online", onUserOnline);
    socket.on("user:online", onUserOnline);
    socket.on("chat:user:online", onUserOnline);

    socket.on("presence:offline", onUserOffline);
    socket.on("user:offline", onUserOffline);
    socket.on("chat:user:offline", onUserOffline);

    socket.on("presence:list", onPresenceList);
    socket.on("chat:presence:list", onPresenceList);

    // Messages
    socket.on("chat:newMessage", onIncomingMessage);
    socket.on("message:new", onIncomingMessage);

    /* =====================================================
       CLEANUP
    ===================================================== */
    return () => {
      try {
        socket.off("connect", onConnect);

        socket.off("presence:online", onUserOnline);
        socket.off("user:online", onUserOnline);
        socket.off("chat:user:online", onUserOnline);

        socket.off("presence:offline", onUserOffline);
        socket.off("user:offline", onUserOffline);
        socket.off("chat:user:offline", onUserOffline);

        socket.off("presence:list", onPresenceList);
        socket.off("chat:presence:list", onPresenceList);

        socket.off("chat:newMessage", onIncomingMessage);
        socket.off("message:new", onIncomingMessage);
      } catch {}

      disconnectSocket();
      socketRef.current = null;
    };
  }, [token, dispatch]);
}
