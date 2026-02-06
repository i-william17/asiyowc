require("dotenv").config();
const mongoose = require("mongoose");

const Mentor = require("../models/Mentor");
const User = require("../models/User");



/* =====================================================
   CONNECT DB
===================================================== */

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(console.error);



/* =====================================================
   SEED
===================================================== */

async function seedMentor() {
  try {

    /* =================================================
       🔹 GET EXISTING USER AUTOMATICALLY
       change email if you want specific account
    ================================================= */

    let user =
      await User.findOne({ email: "williamsisulu2003@gmail.com" }) ||
      await User.findOne(); // fallback to first user

    if (!user) {
      throw new Error("No users found in DB. Create a user first.");
    }

    console.log("Using user:", user.email);



    /* =================================================
       REMOVE OLD MENTOR (safe re-run)
    ================================================= */

    await Mentor.deleteOne({ user: user._id });



    /* =================================================
       CREATE VERIFIED MENTOR
       (ONLY mentor, no user creation)
    ================================================= */

    const mentor = await Mentor.create({
      user: user._id,

      name: user.profile?.fullName || "Mentor",
      title: "Financial Advisor & Business Coach",
      bio: "Helping entrepreneurs scale sustainable businesses across Africa.",
      specialty: "Finance & Investment",
      experience: "12+ years",

      skills: ["Finance", "Investment", "Leadership", "Startups"],
      languages: ["English", "Swahili"],

      avatar: user.profile?.avatar?.url,

      rating: 4.9,
      mentees: 198,
      sessions: 1050,
      totalReviews: 342,

      /* ================= VERIFIED ================= */
      verified: true,
      verificationStatus: "approved",

      verificationDocs: [
        {
          label: "National ID",
          url: "https://drive.google.com/file/d/sampleID/view",
          provider: "drive",
        },
        {
          label: "Certificate",
          url: "https://drive.google.com/file/d/sampleCert/view",
          provider: "drive",
        },
      ],

      /* ================= STORIES ================= */
      stories: [
        {
          title: "From Ksh 10k to Ksh 2M Business",
          content:
            "Mentorship transformed my financial discipline and allowed me to scale operations consistently.",
          image:
            "https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=800",
          views: 1200,
        },
        {
          title: "Why Investing Early Matters",
          content:
            "Compounding works magic. Starting small is better than waiting for perfect conditions.",
          image:
            "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800",
          views: 870,
        },
      ],

      availability: [
        { day: "Monday", from: "09:00", to: "17:00" },
        { day: "Wednesday", from: "10:00", to: "16:00" },
      ],

      pricePerSession: 0,
      isActive: true,
      isSuspended: false,
    });



    console.log("✅ Mentor seeded successfully!");
    console.log("Mentor ID:", mentor._id);

    process.exit();

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedMentor();
