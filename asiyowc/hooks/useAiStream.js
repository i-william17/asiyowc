// asiyowc/hooks/useAiStream.js
import { useEffect, useRef } from "react";
import { connectSocket } from "../services/socket";

export function useAiStream({ token, onChunk, onDone, onError }) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    socketRef.current = connectSocket(token);
    const socket = socketRef.current;

    if (!socket) return;

    socket.on("ai:chunk", onChunk);
    socket.on("ai:done", onDone);
    socket.on("ai:error", onError);

    return () => {
      socket.off("ai:chunk", onChunk);
      socket.off("ai:done", onDone);
      socket.off("ai:error", onError);
    };
  }, [token, onChunk, onDone, onError]);

  /* ===============================
     🔥 EXPOSE MEMORY CLEAR
  =============================== */
  const clearAiMemory = () => {
    if (socketRef.current) {
      socketRef.current.emit("ai:clear");
    }
  };

  return { clearAiMemory };
}
