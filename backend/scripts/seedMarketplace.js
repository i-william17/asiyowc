/* ======================================================
   Marketplace Seeder (USES EXISTING USERS ONLY)
====================================================== */

require("dotenv").config();
const mongoose = require("mongoose");

/* ================= MODELS ================= */
const Product = require("../models/Product");
const Job = require("../models/Job");
const Funding = require("../models/Funding");
const Skill = require("../models/Skill");
const User = require("../models/User");

/* ================= CONFIG ================= */

const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/test";

/* ======================================================
   HELPERS
====================================================== */

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const image = (n) =>
  `https://picsum.photos/seed/market${n}/600/600`;

/* ======================================================
   DATA POOLS
====================================================== */

const locations = ["Nairobi","Mombasa","Kisumu","Nakuru","Eldoret"];

const productTitles = [
  "Handmade Necklace",
  "Organic Shea Butter",
  "Ankara Tote Bag",
  "Canva Templates",
];

const skillsList = [
  "React Native",
  "UI/UX Design",
  "Marketing",
  "Finance Consulting",
];

const companies = [
  "SeptaGreen",
  "Emberprise",
  "Asiyo Labs",
];

const fundingTitles = [
  "Women Tech Grant",
  "Youth Startup Loan",
  "SME Growth Fund",
];

/* ======================================================
   MAIN SEED
====================================================== */

async function seed() {
  try {
    console.log("🔌 Connecting...");
    await mongoose.connect(MONGO_URI);

    /* ================= LOAD EXISTING USERS ================= */
    console.log("👤 Loading existing users...");

    const users = await User.find({});

    if (!users.length) {
      throw new Error("❌ No users found. Seed users first.");
    }

    console.log(`✅ Found ${users.length} users`);

    /* ================= CLEAR OLD MARKETPLACE DATA ================= */
    console.log("🧹 Clearing marketplace collections...");

    await Promise.all([
      Product.deleteMany({}),
      Skill.deleteMany({}),
      Job.deleteMany({}),
      Funding.deleteMany({})
    ]);

    /* ======================================================
       PRODUCTS
    ====================================================== */

    console.log("🛍 Seeding products...");

    const products = [];

    for (let i = 0; i < 25; i++) {
      const seller = rand(users);

      products.push({
        title: rand(productTitles),
        description: "High quality locally crafted product",
        price: randInt(500, 12000),
        category: rand(["crafts","fashion","home","digital"]),
        images: [image(i), image(i+1)],
        seller: seller._id,
        sellerName: seller.profile?.fullName || "Seller",
        location: rand(locations),
        quantity: randInt(1, 10),
        views: randInt(10, 200),
        favoritesCount: randInt(0, 50),
      });
    }

    await Product.insertMany(products);

    /* ======================================================
       SKILLS
    ====================================================== */

    console.log("🧠 Seeding skills...");

    const skills = [];

    for (let i = 0; i < 20; i++) {
      const user = rand(users);

      skills.push({
        user: user._id,
        userName: user.profile?.fullName || "User",
        avatar: user.profile?.avatar?.url,
        skill: rand(skillsList),
        category: rand(["design","development","marketing","finance"]),
        offer: "Professional service",
        exchangeFor: "Payment or collaboration",
        location: rand(locations),
      });
    }

    await Skill.insertMany(skills);

    /* ======================================================
       JOBS
    ====================================================== */

    console.log("💼 Seeding jobs...");

    const jobs = [];

    for (let i = 0; i < 15; i++) {
      const user = rand(users);

      jobs.push({
        title: "Frontend Developer",
        company: rand(companies),
        companyId: user._id,
        description: "Work on impactful projects",
        type: rand(["full-time","remote","contract"]),
        location: rand(locations),
        salary: "KES 80,000 - 150,000",
        category: "technology",
        contactEmail: `hr${i}@company.com`,
        postedBy: user._id,
      });
    }

    await Job.insertMany(jobs);

    /* ======================================================
       FUNDING
    ====================================================== */

    console.log("💰 Seeding funding...");

    const funding = [];

    for (let i = 0; i < 10; i++) {
      const user = rand(users);

      funding.push({
        title: rand(fundingTitles),
        provider: rand(companies),
        providerId: user._id,
        description: "Funding for startups",
        amount: "KES 100,000 - 500,000",
        type: rand(["grant","loan"]),
        category: rand(["technology","women","youth"]),
        deadline: new Date(Date.now() + 30 * 86400000),
        contactEmail: `fund${i}@fund.org`,
      });
    }

    await Funding.insertMany(funding);

    console.log("\n✅ Marketplace seeded using EXISTING users only!");
    process.exit(0);

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
