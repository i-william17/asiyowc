/**
 * Seed a Group + Group Chat (SAFE & IDENTITY-CORRECT)
 */

const mongoose = require("mongoose");
require("dotenv").config();

const Group = require("../models/Group");
const Chat = require("../models/Chat");
const User = require("../models/User");

const MONGODB_URI = process.env.MONGODB_URI;

/* ===========================
   CONFIG (EDIT THESE)
=========================== */

const GROUP_NAME = "Women Founders Circle";
const GROUP_DESCRIPTION =
  "A safe and empowering space for women founders to collaborate, share opportunities, and grow together.";

const GROUP_PRIVACY = "private"; // public | private | invite

// ✅ VALID AVATAR (HTTPS, mobile-safe)
const GROUP_AVATAR =
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80";

// 👇 must already exist in DB
const CREATOR_EMAIL = "willi3odhiambo@gmail.com";

/* ===========================
   SEED SCRIPT
=========================== */

async function seedGroup() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB connected");

    /* ---------------------------
       FIND CREATOR USER
    ---------------------------- */
    const creator = await User.findOne({ email: CREATOR_EMAIL });

    if (!creator) {
      throw new Error(`Creator not found: ${CREATOR_EMAIL}`);
    }

    console.log("👤 Creator:", creator._id.toString());

    /* ---------------------------
       CHECK IF GROUP EXISTS
    ---------------------------- */
    const existing = await Group.findOne({
      name: GROUP_NAME,
      isRemoved: false,
    });

    if (existing) {
      console.log("⚠️ Group already exists:", existing._id.toString());
      process.exit(0);
    }

    /* ---------------------------
       CREATE GROUP CHAT FIRST
    ---------------------------- */
    const chat = await Chat.create({
      type: "group",
      participants: [creator._id],
      messages: [],
      isRemoved: false,
    });

    console.log("💬 Group chat created:", chat._id.toString());

    /* ---------------------------
       CREATE GROUP
    ---------------------------- */
    const group = await Group.create({
      name: GROUP_NAME,
      description: GROUP_DESCRIPTION,
      avatar: GROUP_AVATAR, // ✅ VALID AVATAR
      privacy: GROUP_PRIVACY,

      createdBy: creator._id,
      admins: [creator._id],
      members: [
        {
          user: creator._id,
          joinedAt: new Date(),
        },
      ],

      chat: chat._id, // 🔥 CRITICAL LINK
      isRemoved: false,
      isArchived: false,
    });

    console.log("👥 Group created:", group._id.toString());

    /* ---------------------------
       FINAL SYNC CHECK
    ---------------------------- */
    chat.participants = [creator._id];
    await chat.save();

    console.log("🔗 Chat linked & synced");
    console.log("🎉 GROUP SEED COMPLETE");

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

seedGroup();
