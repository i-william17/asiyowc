/**
 * Seed TEST Voice Room using EXISTING USERS
 * ----------------------------------------
 * Safe for dev / staging
 *
 * Usage:
 *   node scripts/seedVoice.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const Voice = require("../models/Voice");
const User = require("../models/User");

/* =====================================================
   CONFIG
===================================================== */

const REQUIRED_USER_COUNT = 3; // host + speakers/listeners
const CLEAR_EXISTING = false;

/* =====================================================
   MONGODB CONNECTION
===================================================== */

async function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error("❌ MONGODB_URI not found in environment");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
  });

  console.log("✅ MongoDB connected");
}

/* =====================================================
   FETCH EXISTING USERS
===================================================== */

async function getExistingUsers() {
  const users = await User.find({ isActive: true })
    .sort({ createdAt: 1 })
    .limit(10);

  if (users.length < REQUIRED_USER_COUNT) {
    throw new Error(
      `❌ Need at least ${REQUIRED_USER_COUNT} existing users. Found ${users.length}`
    );
  }

  return users;
}

/* =====================================================
   MAIN SEED
===================================================== */

async function seedVoice() {
  try {
    /* ================= CONNECT ================= */
    await connectDB();

    if (CLEAR_EXISTING) {
      await Voice.deleteMany({ title: /Test Voice Room/i });
      console.log("🧹 Old test voice rooms removed");
    }

    /* ================= USERS ================= */
    const users = await getExistingUsers();

    const host = users[0];
    const speakers = users.slice(1, 2);     // 1 speaker
    const listeners = users.slice(2, 4);    // remaining listeners

    /* ================= INSTANCE ================= */
    const now = new Date();
    const endsAt = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour

    const instance = {
      startsAt: now,
      endsAt,
      status: "live",

      speakers: [
        host._id,
        ...speakers.map((u) => u._id),
      ],

      participants: listeners.map((u) => u._id),
      sharedPosts: [],
    };

    /* ================= VOICE ================= */
    const voice = await Voice.create({
      title: "Test Voice Room — Community AMA",
      host: host._id,
      group: null,
      hub: null,
      instances: [instance],
    });

    /* ================= OUTPUT ================= */
    console.log("\n🎙 TEST VOICE ROOM CREATED");
    console.log("──────────────────────────");
    console.log("Voice ID:", voice._id.toString());
    console.log("Title:", voice.title);
    console.log("Host:", host.profile.fullName);
    console.log("Is Live:", voice.isLive);
    console.log("Speakers:", voice.speakersCount);
    console.log("Listeners:", voice.listenersCount);
    console.log("Participants:", voice.participantsCount);
    console.log("Current Instance ID:", voice.currentInstance?._id);

    console.log("\n👥 USERS");
    console.log("🎤 HOST →", host.profile.fullName, host._id.toString());
    speakers.forEach((u) =>
      console.log("🗣 SPEAKER →", u.profile.fullName, u._id.toString())
    );
    listeners.forEach((u) =>
      console.log("🎧 LISTENER →", u.profile.fullName, u._id.toString())
    );
  } catch (err) {
    console.error("❌ Seed failed:", err.message || err);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 MongoDB connection closed");
    process.exit(0);
  }
}

/* =====================================================
   RUN
===================================================== */

seedVoice();
