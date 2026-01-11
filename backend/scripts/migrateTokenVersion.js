const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");

async function migrateTokenVersion() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const result = await User.updateMany(
      { tokenVersion: { $exists: false } },
      { $set: { tokenVersion: 0 } }
    );

    console.log("🎉 Migration complete");
    console.log(`🧮 Modified users: ${result.modifiedCount}`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

migrateTokenVersion();
