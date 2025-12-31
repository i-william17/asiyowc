/* eslint-disable no-console */
const mongoose = require('mongoose');
require('dotenv').config();

const Post = require('../models/Post');

const MONGO_URI = process.env.MONGODB_URI;

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  const posts = await Post.find({});
  console.log(`🔍 Found ${posts.length} posts`);

  for (const post of posts) {
    let modified = false;

    /* =========================
       MIGRATE POST LIKES
    ========================= */

    // If old reactions.like exists
    if (
      post.reactions &&
      typeof post.reactions.like === 'number'
    ) {
      post.likesCount = post.reactions.like;
      post.reactions.likes = post.reactions.likes || [];
      delete post.reactions.like;
      modified = true;
    }

    // Ensure structure exists
    if (!post.reactions) {
      post.reactions = { likes: [] };
      modified = true;
    }

    if (!Array.isArray(post.reactions.likes)) {
      post.reactions.likes = [];
      modified = true;
    }

    if (typeof post.likesCount !== 'number') {
      post.likesCount = post.reactions.likes.length;
      modified = true;
    }

    /* =========================
       MIGRATE COMMENTS
    ========================= */
    if (Array.isArray(post.comments)) {
      for (const comment of post.comments) {
        if (!Array.isArray(comment.likes)) {
          comment.likes = [];
          modified = true;
        }

        if (typeof comment.likesCount !== 'number') {
          comment.likesCount = comment.likes.length;
          modified = true;
        }
      }

      if (typeof post.commentsCount !== 'number') {
        post.commentsCount = post.comments.filter(c => !c.isRemoved).length;
        modified = true;
      }
    }

    if (modified) {
      await post.save();
      console.log(`🛠 Migrated post ${post._id}`);
    }
  }

  console.log('✅ Migration complete');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed', err);
  process.exit(1);
});
