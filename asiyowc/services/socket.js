// asiyowc/services/socket.js
import { io } from "socket.io-client";
import { server } from "../server";

/*
  Singleton socket instance
  - Ensures only ONE socket connection exists
  - Safe across Fast Refresh / hot reload
*/
let socket = null;

/* ============================================================
   CONNECT SOCKET
   - Uses JWT token for auth
   - Auto reconnect
   - WebSocket only (no polling)
============================================================ */
export const connectSocket = (token) => {
  if (!token) {
    console.warn("[socket] ❌ No token provided, skipping socket connect");
    return null;
  }

  // Prevent duplicate connections
  if (socket && socket.connected) {
    return socket;
  }

  // server = http://ip:5000/api  → socket = http://ip:5000
  // const baseUrl = server.replace("/api", "");
  const baseUrl = "https://api.asiyoconnect.com";

  socket = io(baseUrl, {
    path: "/socket.io/",
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 4000,
    auth: { token },
    autoConnect: true,
    forceNew: false,
  });

  /* =====================================================
     CORE SOCKET LOGGING (SAFE)
  ===================================================== */
  socket.on("connect", () => {
    console.log("🟢 [socket] connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔴 [socket] disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("❌ [socket] connect error:", err?.message || err);
  });

  socket.io?.on("reconnect_attempt", (attempt) => {
    console.log("🔄 [socket] reconnect attempt:", attempt);
  });

  socket.io?.on("reconnect", () => {
    console.log("✅ [socket] reconnected");
  });

  return socket;
};

/* ============================================================
   GET SOCKET (READ-ONLY ACCESS)
============================================================ */
export const getSocket = () => socket;

/* ============================================================
   DISCONNECT SOCKET (LOGOUT / APP EXIT)
============================================================ */
export const disconnectSocket = () => {
  if (!socket) return;

  try {
    socket.removeAllListeners();
    socket.disconnect();
  } catch (e) {
    console.warn("[socket] disconnect warning:", e);
  }

  socket = null;
};
