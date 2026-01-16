const mongoose = require('mongoose');
require('dotenv').config();

const Chat = require('../models/Chat');

const MONGO_URI = process.env.MONGODB_URI;

const generateDmKey = (participants) => {
  if (!Array.isArray(participants) || participants.length !== 2) return null;
  return participants.map(String).sort().join('_');
};

async function migrateDmKeys() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const cursor = Chat.find({
    type: 'dm',
    isRemoved: false
  }).cursor();

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for await (const chat of cursor) {
    try {
      if (chat.dmKey) {
        skipped++;
        continue;
      }

      if (!Array.isArray(chat.participants) || chat.participants.length !== 2) {
        console.warn(`⚠️ Skipping invalid DM chat ${chat._id}`);
        skipped++;
        continue;
      }

      const dmKey = generateDmKey(chat.participants);
      if (!dmKey) {
        skipped++;
        continue;
      }

      await Chat.updateOne(
        { _id: chat._id },
        { $set: { dmKey } },
        { runValidators: false }
      );

      updated++;
      console.log(`✅ Updated chat ${chat._id} → ${dmKey}`);
    } catch (err) {
      errors++;
      console.error(`❌ Error updating chat ${chat._id}:`, err.message);
    }
  }

  console.log('\n📊 Migration Summary');
  console.log('Updated:', updated);
  console.log('Skipped:', skipped);
  console.log('Errors:', errors);

  await mongoose.disconnect();
  console.log('🔌 Disconnected');
}

migrateDmKeys().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
