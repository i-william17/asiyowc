const mongoose = require('mongoose');
require('dotenv').config();

const Post = require('../models/Post'); // FIX PATH IF NEEDED

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('CONNECTED TO DB:', mongoose.connection.name);

  const posts = await Post.find({ "reactions.like": { $exists: true } });
  console.log('POSTS TO MIGRATE:', posts.length);

  for (const post of posts) {
    console.log('MIGRATING:', post._id.toString());

    const oldLikeCount = post.reactions.like;

    post.likesCount = oldLikeCount;
    post.reactions = { likes: [] };

    await post.save();
  }

  console.log('DONE');
  process.exit(0);
}

run();
