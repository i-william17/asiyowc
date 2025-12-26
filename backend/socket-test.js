const { io } = require("socket.io-client");

// 🔴 Replace with a REAL JWT from your app login
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5Mjc0NTI0MzVkYjkwMzg5Yzc5NjJmMSIsImlhdCI6MTc2NjU2MDU2MCwiZXhwIjoxNzY5MTUyNTYwfQ.cz2Mmo5rzzssv9ak59wvSi2jlg_3TEpNW0ldP5r221M";

const socket = io("http://localhost:5000", {
  auth: {
    token: TOKEN
  },
  transports: ["websocket"]
});

socket.on("connect", () => {
  console.log("✅ Connected to socket server");
  console.log("Socket ID:", socket.id);

  // Join all chats (tests chat handler)
  socket.emit("chat:joinAll", {}, (res) => {
    console.log("chat:joinAll response:", res);
  });
});

socket.on("user:online", (data) => {
  console.log("🟢 user online:", data);
});

socket.on("user:offline", (data) => {
  console.log("🔴 user offline:", data);
});

socket.on("message:new", (data) => {
  console.log("📩 New message:", data);
});

socket.on("connect_error", (err) => {
  console.error("❌ Connection error:", err.message);
});

socket.on("disconnect", (reason) => {
  console.log("⚠️ Disconnected:", reason);
});
