/* =====================================================
   SEED EVENTS SCRIPT
   Run: node scripts/seedEvents.js
===================================================== */

require("dotenv").config();
const mongoose = require("mongoose");

const Event = require("../models/Event");
const User = require("../models/User"); // organizer reference

/* =====================================================
   CONNECT DB
===================================================== */

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Mongo connected");
}


/* =====================================================
   SEED
===================================================== */

async function seed() {
  try {
    await connectDB();

    /* ---------------------------------------------
       Find any existing user to be organizer
       (or change email to yours)
    --------------------------------------------- */
    const organizer = await User.findOne({
      email: "williamsisulu2003@gmail.com"
    });

    if (!organizer) {
      throw new Error("Organizer user not found");
    }

    /* ---------------------------------------------
       Clear old seeded events (optional)
    --------------------------------------------- */
    await Event.deleteMany({
      title: { $in: ["Asiyo Women Leadership Summit", "Premium Business Masterclass"] }
    });

    /* ---------------------------------------------
       EVENTS
    --------------------------------------------- */
    const events = [
      /* =================================================
         FREE EVENT
      ================================================= */
      {
        title: "Asiyo Women Leadership Summit",
        description:
          "A free virtual summit connecting women leaders, entrepreneurs and changemakers across Africa.",

        organizer: organizer._id,

        category: "conference",

        type: "virtual",

        location: {
          onlineLink: "https://meet.google.com/asiyo-leaders",
          platform: "google-meet"
        },

        image: {
          url: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800"
        },

        dateTime: {
          start: new Date("2026-02-15T09:00:00+03:00"),
          end: new Date("2026-02-15T13:00:00+03:00"),
          timezone: "Africa/Nairobi"
        },

        price: {
          amount: 0,
          currency: "KES",
          isFree: true
        },

        visibility: "public",
        status: "published",

        capacity: 0, // unlimited
      },


      /* =================================================
         PAID EVENT
      ================================================= */
      {
        title: "Premium Business Masterclass",
        description:
          "Deep-dive paid masterclass on scaling your business, funding and growth strategies with industry experts.",

        organizer: organizer._id,

        category: "training",

        type: "in-person",

        location: {
          address: "Sarit Centre",
          city: "Nairobi",
          country: "Kenya"
        },

        image: {
          url: "https://images.unsplash.com/photo-1515169067865-5387ec356754?w=800"
        },

        dateTime: {
          start: new Date("2026-03-10T10:00:00+03:00"),
          end: new Date("2026-03-10T16:00:00+03:00"),
          timezone: "Africa/Nairobi"
        },

        price: {
          amount: 2500, // paid
          currency: "KES",
          isFree: false
        },

        capacity: 120,
        visibility: "public",
        status: "published",
      }
    ];

    await Event.insertMany(events);

    console.log("🎉 Events seeded successfully");
    process.exit();

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
