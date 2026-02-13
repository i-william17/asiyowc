const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});

const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    /* ================= CONNECT ================= */
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Mongo connected for seeding');

    /* ================= CHECK EXISTING ================= */
    const existingAdmin = await User.findOne({ isAdmin: true });

    if (existingAdmin) {
      console.log('🟢 Admin already exists. Skipping seed.');
      process.exit(0);
    }

    console.log('🟡 No admin found. Creating one...');

    /* ================= CREATE ADMIN ================= */
    // 🚨 DO NOT HASH HERE — model pre('save') will hash automatically
    await User.create({
      email: 'myownwhatsappbackup2024@gmail.com',
      phone: '+254798765432',
      password: process.env.ADMIN_PASSWORD || 'asiyo2026', // ✅ plain text
      isAdmin: true,
      hasRegistered: true,
      isVerified: { email: true },
      profile: {
        fullName: 'System Admin',
        role: 'professional',
      },
    });

    console.log('🎉 Admin seeded successfully');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Admin seed failed:', error.message);
    process.exit(1);
  }
};

seedAdmin();
