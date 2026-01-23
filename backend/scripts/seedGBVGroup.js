/**
 * Seed ONE system (GBV) group with its authoritative chat
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Group = require('../models/Group');
const Chat = require('../models/Chat');
const User = require('../models/User');

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.DATABASE_URL;

if (!MONGO_URI) {
  throw new Error(
    '❌ MongoDB URI not found. Set MONGODB_URI, MONGO_URI, or DATABASE_URL in .env'
  );
}

// 🔒 CONFIG
const GBV_GROUP_NAME = 'GBV Support Forum';
const GBV_GROUP_DESCRIPTION =
  'Private, confidential support space for GBV survivors.';
const SYSTEM_PRIVACY = 'system';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  // 1️⃣ Find a system creator (admin preferred)
  const systemUser =
    (await User.findOne({ role: 'admin' }).select('_id')) ||
    (await User.findOne().select('_id'));

  if (!systemUser) {
    throw new Error('❌ No users found in database to assign as createdBy');
  }

  console.log('👤 System creator:', systemUser._id.toString());

  // 2️⃣ Check if GBV group already exists
  let group = await Group.findOne({
    privacy: SYSTEM_PRIVACY,
    isRemoved: false
  });

  if (group) {
    console.log('ℹ️ GBV system group already exists:', group._id);

    if (!group.chat) {
      console.log('⚠️ Group has no chat — fixing');

      const chat = await Chat.create({
        type: 'group',
        participants: []
      });

      group.chat = chat._id;
      await group.save();

      console.log('🔗 Chat linked:', chat._id);
    }

    await mongoose.disconnect();
    console.log('✅ Done (no changes needed)');
    return;
  }

  // 3️⃣ Create authoritative chat
  const chat = await Chat.create({
    type: 'group',
    participants: []
  });

  console.log('💬 Group chat created:', chat._id);

  // 4️⃣ Create GBV system group
  group = await Group.create({
    name: GBV_GROUP_NAME,
    description: GBV_GROUP_DESCRIPTION,
    avatar: null,

    createdBy: systemUser._id,   // ✅ REQUIRED
    admins: [],                  // no visible admins
    members: [],

    chat: chat._id,
    privacy: SYSTEM_PRIVACY,
    posts: [],
    isRemoved: false,
    isArchived: false
  });

  console.log('🛡️ GBV system group created:', group._id);

  await mongoose.disconnect();
  console.log('✅ Done');
}

run().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
