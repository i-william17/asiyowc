/**
 * Seed a Savings Pod for testing payments & contributions
 * Run with: node scripts/seedSavingsPod.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const SavingsPod = require("../models/SavingsPod");
const User = require("../models/User");

const MONGODB_URI = process.env.MONGODB_URI;

// 🔧 CHANGE THIS EMAIL TO AN EXISTING USER
const CREATOR_EMAIL = "willi3odhiambo@gmail.com";

async function seed() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);

    // 1️⃣ Find creator
    const creator = await User.findOne({ email: CREATOR_EMAIL });
    if (!creator) {
      throw new Error(`User not found with email: ${CREATOR_EMAIL}`);
    }

    console.log("👤 Creator found:", creator.profile?.fullName || creator.email);

    // 2️⃣ Prevent duplicates (optional but recommended)
    const existing = await SavingsPod.findOne({
      name: "Asiyo Test Savings Pod",
      creator: creator._id,
    });

    if (existing) {
      console.log("⚠️ Pod already exists:");
      console.log("🆔 Pod ID:", existing._id.toString());
      return process.exit(0);
    }

    // 3️⃣ Create pod
    const pod = await SavingsPod.create({
      name: "GBV",
      description: "Savings to help fellow sister enduring GBV",
      creator: creator._id,
      category: "emergency",

      goal: {
        targetAmount: 50000,
        currency: "KES",
        description: "Help fellow sister enduring GBV",
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
      },

      contributionSettings: {
        frequency: "daily",
        amount: 1000,
        autoDeduct: false,
      },

      members: [
        {
          user: creator._id,
          role: "admin",
          isActive: true,
          joinedAt: new Date(),
        },
      ],

      currentBalance: 0,

      settings: {
        privacy: "public",
        maxMembers: 20,
        allowWithdrawals: true,
        requireApproval: false,
      },

      statistics: {
        totalContributions: 0,
        totalWithdrawals: 0,
        activeMembers: 1,
      },

      status: "active",
    });

    console.log("✅ Savings Pod created successfully!");
    console.log("🆔 Pod ID:", pod._id.toString());
    console.log("🏦 Account Reference:", `SAVINGS:${pod._id}`);
    console.log("💰 Target Amount:", pod.goal.targetAmount, pod.goal.currency);

  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
