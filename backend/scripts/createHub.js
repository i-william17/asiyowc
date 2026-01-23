// scripts/createHub.js
require("dotenv").config();
const mongoose = require("mongoose");
const Hub = require("../models/Hub");

/* =====================================================
   CONFIG
===================================================== */
const MONGO_URI = process.env.MONGODB_URI;

/* =====================================================
   CREATE HUB
===================================================== */
async function createHub() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");

    const hub = new Hub({
      name: "Asiyo Global Hub",
      description: "Official global hub for announcements and updates.",
      avatar: "https://res.cloudinary.com/ducckh8ip/image/upload/v1767041161/asiyo-app/g8qhmmfvrqwlb7iea0cp.jpg",

      type: "global", // regional | international | global
      // region: "Africa", // ONLY required if type === 'regional'

      moderators: [
        // Replace with real User ObjectIds
        // mongoose.Types.ObjectId("USER_ID_1"),
        // mongoose.Types.ObjectId("USER_ID_2"),
      ],

      members: [
        // Optional initial members
        // mongoose.Types.ObjectId("USER_ID_3"),
      ],

      posts: [],

      reactions: [], // optional (defaults to [])
    });

    await hub.save();

    console.log("🎉 Hub created successfully:");
    console.log({
      id: hub._id.toString(),
      name: hub.name,
      type: hub.type,
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to create hub:", error);
    process.exit(1);
  }
}

createHub();
