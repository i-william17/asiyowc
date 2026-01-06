/**
 * One-time migration:
 * Adds profile.location to existing users if missing
 */

const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User"); // adjust path if needed

const MONGO_URI = process.env.MONGODB_URI;

async function runMigration() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);

    console.log("✅ Connected. Running migration...");

    const result = await User.updateMany(
      {
        $or: [
          { "profile.location": { $exists: false } },
          { "profile.location.country": { $exists: false } }
        ]
      },
      {
        $set: {
          "profile.location": {
            country: "",
            countryCode: "",
            city: ""
          }
        }
      }
    );

    console.log("🎉 Migration complete!");
    console.log("Modified users:", result.modifiedCount);

    await mongoose.disconnect();
    console.log("🔌 Disconnected");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
