const mongoose = require("mongoose");
require("dotenv").config();

const { generateChatKey, encryptChatKey } = require("../utils/chatCrypto");

const Chat = require("../models/Chat");

async function fixChats() {
  await mongoose.connect(process.env.MONGODB_URI);

  const chats = await Chat.find({});

  for (const chat of chats) {
    const chatKey = generateChatKey();

    const enc = encryptChatKey(chatKey);

    chat.encryptedChatKey = enc.encryptedChatKey;
    chat.chatKeyIv = enc.chatKeyIv;
    chat.chatKeyTag = enc.chatKeyTag;
    chat.keyVersion = enc.keyVersion;

    await chat.save();

    console.log("fixed chat", chat._id);
  }

  console.log("All chats repaired");
  process.exit();
}

fixChats();