/**
 * Seed missing chat message fields
 * SAFE & IDEMPOTENT
 *
 * Run once or multiple times — no side effects
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Chat = require('../models/Chat');

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not set');
  process.exit(1);
}

(async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected');

    const cursor = Chat.find({ isRemoved: false }).cursor();

    let chatCount = 0;
    let messageCount = 0;

    for await (const chat of cursor) {
      let chatModified = false;

      /* =====================
         CHAT-LEVEL FIELDS
      ===================== */
      if (chat.pinnedMessage === undefined) {
        chat.pinnedMessage = null;
        chatModified = true;
      }

      /* =====================
         MESSAGE-LEVEL FIELDS
      ===================== */
      if (Array.isArray(chat.messages)) {
        chat.messages.forEach((msg) => {
          let msgModified = false;

          if (msg.replyTo === undefined) {
            msg.replyTo = null;
            msgModified = true;
          }

          if (!Array.isArray(msg.reactions)) {
            msg.reactions = [];
            msgModified = true;
          }

          if (!Array.isArray(msg.readBy)) {
            msg.readBy = [];
            msgModified = true;
          }

          if (!Array.isArray(msg.deletedFor)) {
            msg.deletedFor = [];
            msgModified = true;
          }

          if (msg.isDeletedForEveryone === undefined) {
            msg.isDeletedForEveryone = false;
            msgModified = true;
          }

          if (msgModified) {
            messageCount++;
            chatModified = true;
          }
        });
      }

      if (chatModified) {
        await chat.save({ validateBeforeSave: false });
        chatCount++;
      }
    }

    console.log('✅ Seeding completed');
    console.log(`📦 Chats updated: ${chatCount}`);
    console.log(`💬 Messages updated: ${messageCount}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
})();
