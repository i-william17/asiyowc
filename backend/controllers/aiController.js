const axios = require("axios");

/* =====================================================
   IN-MEMORY CONVERSATION STORE
===================================================== */
const conversations = new Map();

exports.chatWithAi = async (req, res) => {
  try {
    const { message } = req.body;
    const io = req.io;
    const userId = String(req.user.id);
    const room = `user:${userId}`;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    /* =====================================================
       INITIALIZE CONVERSATION
    ===================================================== */
    if (!conversations.has(room)) {
      conversations.set(room, [
        {
          role: "system",
          content: `
You are Asiyo, a warm, empowering assistant for Asiyo Women Connect community members.
Africa-first with Kenyan roots.
Be practical, culturally aware, and concise.
Maintain continuity across the conversation. 
Do not break character. Give the best advice and support you can. Don't mention you are an AI model.
          `.trim(),
        },
      ]);
    }

    const history = conversations.get(room);

    // Add user message
    history.push({ role: "user", content: message });

    // Trim memory (system + last N turns)
    const MAX_TURNS = 10;
    const trimmedHistory = [
      history[0], // system prompt
      ...history.slice(-MAX_TURNS * 2),
    ];

    // Acknowledge HTTP immediately
    res.json({ status: "streaming" });

    /* =====================================================
       OLLAMA CALL
    ===================================================== */
    const response = await axios.post(
      "http://localhost:11434/api/chat",
      {
        model: "llama3:8b",
        messages: trimmedHistory,
        stream: true,
        options: { temperature: 0.7 },
      },
      {
        responseType: "stream",
        timeout: 120000,
      }
    );

    let assistantReply = "";

    response.data.on("data", (chunk) => {
      const lines = chunk.toString().split("\n").filter(Boolean);

      for (const line of lines) {
        try {
          const json = JSON.parse(line);

          if (json.message?.content) {
            assistantReply += json.message.content;
            io.to(room).emit("ai:chunk", json.message.content);
          }

          if (json.done) {
            history.push({
              role: "assistant",
              content: assistantReply,
            });

            io.to(room).emit("ai:done");
          }
        } catch {
          // ignore partial JSON
        }
      }
    });

    response.data.on("error", (err) => {
      console.error("❌ Ollama stream error:", err);
      io.to(room).emit("ai:error", "AI service failed");
    });

  } catch (err) {
    console.error("❌ AI error:", err?.message || err);
    req.io
      ?.to(`user:${String(req.user.id)}`)
      ?.emit("ai:error", "AI service failed");
  }
};

/* =====================================================
   MEMORY CLEAR
===================================================== */
exports.clearAiMemory = (userId) => {
  const room = `user:${String(userId)}`;
  conversations.delete(room);
  console.log("🧹 AI memory cleared for", room);
};
