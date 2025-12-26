/**
 * Seed a group chat using an existing Group.chat ObjectId
 * Run once, then delete.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const Group = require('../models/Group');
const Chat = require('../models/Chat');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  // 🔴 REPLACE WITH YOUR ACTUAL IDS
  const GROUP_ID = '694bd0b540471e75a7225a69';
  const CHAT_ID  = '694cfb804f60f9e603713dda';

  const group = await Group.findById(GROUP_ID);

  if (!group) {
    console.error('❌ Group not found');
    process.exit(1);
  }

  // Check if chat already exists
  const existingChat = await Chat.findById(CHAT_ID);
  if (existingChat) {
    console.log('ℹ️ Chat already exists — nothing to do');
    process.exit(0);
  }

  // Build participants from group members
  const participants = group.members.map(m => m.user);

  const chat = await Chat.create({
    _id: CHAT_ID,              // 🔥 FORCE SAME CHAT ID
    type: 'group',
    participants,
    messages: [],
    isRemoved: false
  });

  console.log('✅ Group chat seeded successfully');
  console.log({
    chatId: chat._id.toString(),
    participantsCount: chat.participants.length
  });

  process.exit(0);
}

run().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
