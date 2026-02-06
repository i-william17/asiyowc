require("dotenv").config();
const mongoose = require("mongoose");

const Retreat = require("../models/Retreat");
const Journal = require("../models/Journal");
const User = require("../models/User"); // needed to attach journals


/* =====================================================
   CONFIG
===================================================== */

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/asiyo";



/* =====================================================
   SAMPLE DATA
===================================================== */

const retreats = [
  {
    title: "Morning Meditation",
    description: "Start your day calm and focused.",
    instructor: "Dr. Amina Hassan",
    type: "meditation",
    level: "beginner",
    duration: 15,
    category: "focus",
    tags: ["morning", "mindfulness", "calm"],

    // real working mp4
    videoUrl:
      "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",

    isActive: true,
    isFeatured: true,
  },

  {
    title: "Gentle Yoga Flow",
    description: "Stretch and release tension.",
    instructor: "Grace Wanjiru",
    type: "yoga",
    level: "beginner",
    duration: 30,
    category: "fitness",
    tags: ["stretch", "relax"],

    videoUrl:
      "https://samplelib.com/lib/preview/mp4/sample-10s.mp4",

    isActive: true,
  },

  {
    title: "Breathwork for Anxiety",
    description: "Reduce stress with guided breathing.",
    instructor: "Sarah Johnson",
    type: "breathwork",
    level: "intermediate",
    duration: 20,
    category: "stress",
    tags: ["breathing", "stress-relief"],

    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",

    isActive: true,
  },
];


/* =====================================================
   SEED FUNCTION
===================================================== */

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("✅ Mongo connected");


    /* ---------------------------------
       Clear existing (optional)
    --------------------------------- */
    await Retreat.deleteMany();
    await Journal.deleteMany();


    /* ---------------------------------
       Seed Retreats
    --------------------------------- */
    const createdRetreats = await Retreat.insertMany(retreats);

    console.log(`🌿 Seeded ${createdRetreats.length} retreats`);


    /* ---------------------------------
       Seed Journals (for first 3 users)
    --------------------------------- */

    const users = await User.find().limit(3);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const journalDocs = users.map((user, i) => ({
      user: user._id,
      date: today,
      mood: {
        label: ["great", "good", "okay"][i % 3],
        score: 4 - i,
      },
      text: "Feeling grateful and productive today.",
      gratitude: ["family", "health", "growth"],
      tags: ["reflection", "wellness"],
      affirmation: "I am growing every day.",
    }));

    const createdJournals = await Journal.insertMany(journalDocs);

    console.log(`📘 Seeded ${createdJournals.length} journals`);


    console.log("\n🎉 Wellness seed complete!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
