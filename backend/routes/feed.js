const express = require('express');
const { getPersonalizedFeed, getExploreContent } = require('../controllers/feedController');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/personalized', getPersonalizedFeed);
router.get('/explore', getExploreContent);

module.exports = router;

// import express from 'express';
// import Post from '../models/Post.js';
// import Program from '../models/Program.js';
// import User from '../models/User.js';
// import { auth, optionalAuth } from '../middleware/auth.js';
// import AppError from '../utils/AppError.js';
// import { successResponse } from '../middleware/responseFormatter.js';

// const router = express.Router();

// // Get personalized feed
// router.get('/', optionalAuth, async (req, res, next) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const category = req.query.category;
//     const skip = (page - 1) * limit;

//     // Build post query
//     let postQuery = { isActive: true, 'moderation.status': 'approved' };
    
//     if (category && category !== 'all') {
//       postQuery.category = category;
//     }

//     // Handle visibility
//     if (req.user) {
//       postQuery.$or = [
//         { visibility: { $in: ['public', 'community'] } },
//         { author: req.user.id }
//       ];
//     } else {
//       postQuery.visibility = 'public';
//     }

//     // Get posts
//     const posts = await Post.find(postQuery)
//       .populate('author', 'fullName avatar role')
//       .populate('comments.user', 'fullName avatar')
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     // Add interaction status for authenticated users
//     if (req.user) {
//       posts.forEach(post => {
//         post.isLiked = post.likes.includes(req.user.id);
//         post.isSaved = post.savedBy.includes(req.user.id);
//         post.isMine = post.author._id.toString() === req.user.id;
//       });
//     }

//     // Get daily quote (mock data - in production, this would come from a database)
//     const dailyQuote = {
//       text: "When women support each other, incredible things happen.",
//       author: "Phoebe Asiyo",
//       date: new Date().toISOString().split('T')[0]
//     };

//     // Get featured programs
//     const featuredPrograms = await Program.find({
//       status: 'published',
//       isFeatured: true
//     })
//       .populate('mentor', 'fullName avatar role')
//       .limit(5)
//       .lean();

//     // Add enrollment status for authenticated users
//     if (req.user) {
//       featuredPrograms.forEach(program => {
//         program.isEnrolled = program.enrolledUsers.some(
//           enrollment => enrollment.user.toString() === req.user.id
//         );
//       });
//     }

//     const totalPosts = await Post.countDocuments(postQuery);

//     res.status(200).json(
//       successResponse(
//         {
//           posts,
//           dailyQuote,
//           featuredPrograms,
//           pagination: {
//             page,
//             limit,
//             total: totalPosts,
//             pages: Math.ceil(totalPosts / limit),
//             hasMore: page < Math.ceil(totalPosts / limit)
//           }
//         },
//         'Feed retrieved successfully',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Get trending posts
// router.get('/trending', optionalAuth, async (req, res, next) => {
//   try {
//     const limit = parseInt(req.query.limit) || 10;

//     // Build query for trending posts (posts with most engagement in last 7 days)
//     const oneWeekAgo = new Date();
//     oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

//     let query = {
//       isActive: true,
//       'moderation.status': 'approved',
//       createdAt: { $gte: oneWeekAgo }
//     };

//     // Handle visibility
//     if (req.user) {
//       query.$or = [
//         { visibility: { $in: ['public', 'community'] } },
//         { author: req.user.id }
//       ];
//     } else {
//       query.visibility = 'public';
//     }

//     const trendingPosts = await Post.find(query)
//       .populate('author', 'fullName avatar role')
//       .sort({
//         // Sort by engagement score (likes + comments * 2)
//         $expr: {
//           $add: [
//             { $size: '$likes' },
//             { $multiply: [{ $size: '$comments' }, 2] }
//           ]
//         }
//       })
//       .limit(limit)
//       .lean();

//     // Add interaction status for authenticated users
//     if (req.user) {
//       trendingPosts.forEach(post => {
//         post.isLiked = post.likes.includes(req.user.id);
//         post.isSaved = post.savedBy.includes(req.user.id);
//         post.isMine = post.author._id.toString() === req.user.id;
//       });
//     }

//     res.status(200).json(
//       successResponse(
//         { posts: trendingPosts },
//         'Trending posts retrieved successfully',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Get user's personalized feed based on interests
// router.get('/personalized', auth, async (req, res, next) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;

//     const user = await User.findById(req.user.id);
//     const userInterests = user.interests || [];

//     // Build personalized query
//     let query = {
//       isActive: true,
//       'moderation.status': 'approved',
//       $or: [
//         { visibility: { $in: ['public', 'community'] } },
//         { author: req.user.id }
//       ]
//     };

//     // If user has interests, prioritize posts in those categories
//     if (userInterests.length > 0) {
//       query.category = { $in: userInterests };
//     }

//     const posts = await Post.find(query)
//       .populate('author', 'fullName avatar role')
//       .populate('comments.user', 'fullName avatar')
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     // Add interaction status
//     posts.forEach(post => {
//       post.isLiked = post.likes.includes(req.user.id);
//       post.isSaved = post.savedBy.includes(req.user.id);
//       post.isMine = post.author._id.toString() === req.user.id;
//     });

//     const total = await Post.countDocuments(query);

//     res.status(200).json(
//       successResponse(
//         {
//           posts,
//           pagination: {
//             page,
//             limit,
//             total,
//             pages: Math.ceil(total / limit),
//             hasMore: page < Math.ceil(total / limit)
//           }
//         },
//         'Personalized feed retrieved successfully',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Get feed for specific category
// router.get('/category/:category', optionalAuth, async (req, res, next) => {
//   try {
//     const { category } = req.params;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;

//     const validCategories = ['leadership', 'finance', 'wellness', 'advocacy', 'legacy', 'general'];
    
//     if (!validCategories.includes(category)) {
//       return next(new AppError('Invalid category', 400));
//     }

//     let query = {
//       isActive: true,
//       'moderation.status': 'approved',
//       category
//     };

//     // Handle visibility
//     if (req.user) {
//       query.$or = [
//         { visibility: { $in: ['public', 'community'] } },
//         { author: req.user.id }
//       ];
//     } else {
//       query.visibility = 'public';
//     }

//     const posts = await Post.find(query)
//       .populate('author', 'fullName avatar role')
//       .populate('comments.user', 'fullName avatar')
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     // Add interaction status for authenticated users
//     if (req.user) {
//       posts.forEach(post => {
//         post.isLiked = post.likes.includes(req.user.id);
//         post.isSaved = post.savedBy.includes(req.user.id);
//         post.isMine = post.author._id.toString() === req.user.id;
//       });
//     }

//     const total = await Post.countDocuments(query);

//     res.status(200).json(
//       successResponse(
//         {
//           posts,
//           category,
//           pagination: {
//             page,
//             limit,
//             total,
//             pages: Math.ceil(total / limit),
//             hasMore: page < Math.ceil(total / limit)
//           }
//         },
//         `Category feed for ${category} retrieved successfully`,
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// export default router;