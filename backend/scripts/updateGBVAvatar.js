// scripts/updateGBVAvatar.js
const mongoose = require("mongoose");
require("dotenv").config();

const Group = require("../models/Group");

const GBV_GROUP_ID = "697275951422a6255f0dce35";
const AVATAR_URL =
  "https://res.cloudinary.com/ducckh8ip/image/upload/v1766603798/asiyo-app/a8vl3ff1muzlnnunkjy3.jpg";

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const group = await Group.findByIdAndUpdate(
      GBV_GROUP_ID,
      { avatar: AVATAR_URL },
      { new: true }
    );

    if (!group) {
      console.error("❌ GBV group not found");
      process.exit(1);
    }

    console.log("✅ GBV group avatar updated");
    console.log({
      id: group._id,
      name: group.name,
      avatar: group.avatar,
    });

    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to update avatar:", err);
    process.exit(1);
  }
})();
