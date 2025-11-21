const express = require('express');
const { 
  createPost, 
  getPosts, 
  likePost, 
  addComment, 
  flagPost 
} = require('../controllers/postController');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload.js');
const { postValidation, handleValidationErrors } = require('../middleware/validation.js');

const router = express.Router();

router.use(auth);

router.post('/', upload.array('images', 5), postValidation, handleValidationErrors, createPost);
router.get('/', getPosts);
router.post('/:id/like', likePost);
router.post('/:id/comment', addComment);
router.post('/:id/flag', flagPost);

module.exports = router;

// import express from 'express';
// import { body, validationResult } from 'express-validator';
// import Post from '../models/Post.js';
// import User from '../models/User.js';
// import { auth, optionalAuth } from '../middleware/auth.js';
// import AppError from '../utils/AppError.js';
// import { successResponse, errorResponse } from '../middleware/responseFormatter.js';
// import { upload } from '../middleware/upload.js';

// const router = express.Router();

// // Validation middleware
// const validatePost = [
//   body('content')
//     .notEmpty()
//     .withMessage('Post content is required')
//     .isLength({ max: 5000 })
//     .withMessage('Post cannot exceed 5000 characters'),
//   body('category')
//     .isIn(['leadership', 'finance', 'wellness', 'advocacy', 'legacy', 'general'])
//     .withMessage('Invalid category'),
//   body('visibility')
//     .optional()
//     .isIn(['public', 'community', 'private'])
//     .withMessage('Invalid visibility setting')
// ];

// // Get all posts (with pagination and filtering)
// router.get('/', optionalAuth, async (req, res, next) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const category = req.query.category;
//     const skip = (page - 1) * limit;

//     // Build query
//     let query = { isActive: true, 'moderation.status': 'approved' };
    
//     if (category && category !== 'all') {
//       query.category = category;
//     }

//     // If user is authenticated, include their private posts
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

//     // Add like status for authenticated users
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
//           pagination: {
//             page,
//             limit,
//             total,
//             pages: Math.ceil(total / limit)
//           }
//         },
//         'Posts retrieved successfully',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Get single post
// router.get('/:id', optionalAuth, async (req, res, next) => {
//   try {
//     const post = await Post.findById(req.params.id)
//       .populate('author', 'fullName avatar role')
//       .populate('comments.user', 'fullName avatar')
//       .populate('likes', 'fullName avatar')
//       .populate('savedBy', 'fullName avatar');

//     if (!post || !post.isActive) {
//       return next(new AppError('Post not found', 404));
//     }

//     // Check visibility
//     if (post.visibility === 'private' && (!req.user || post.author._id.toString() !== req.user.id)) {
//       return next(new AppError('You do not have permission to view this post', 403));
//     }

//     if (post.visibility === 'community' && !req.user) {
//       return next(new AppError('Please log in to view this post', 401));
//     }

//     // Add interaction status for authenticated users
//     if (req.user) {
//       post.isLiked = post.likes.some(like => like._id.toString() === req.user.id);
//       post.isSaved = post.savedBy.some(user => user._id.toString() === req.user.id);
//       post.isMine = post.author._id.toString() === req.user.id;
//     }

//     res.status(200).json(
//       successResponse(
//         { post },
//         'Post retrieved successfully',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Create post
// router.post('/', auth, upload.single('image'), validatePost, async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return next(new AppError('Validation failed', 400, errors.array()));
//     }

//     const { content, category, tags, visibility } = req.body;

//     const postData = {
//       author: req.user.id,
//       content,
//       category: category || 'general',
//       tags: tags || [],
//       visibility: visibility || 'community'
//     };

//     // Handle image upload
//     if (req.file) {
//       postData.image = {
//         url: req.file.path,
//         publicId: req.file.filename
//       };
//     }

//     const post = await Post.create(postData);

//     // Populate author info
//     await post.populate('author', 'fullName avatar role');

//     // Update user's post count
//     await User.findByIdAndUpdate(req.user.id, {
//       $inc: { 'statistics.postsCount': 1 }
//     });

//     res.status(201).json(
//       successResponse(
//         { post },
//         'Post created successfully',
//         201
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Update post
// router.patch('/:id', auth, upload.single('image'), validatePost, async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return next(new AppError('Validation failed', 400, errors.array()));
//     }

//     const post = await Post.findById(req.params.id);

//     if (!post) {
//       return next(new AppError('Post not found', 404));
//     }

//     // Check ownership
//     if (post.author.toString() !== req.user.id) {
//       return next(new AppError('You can only edit your own posts', 403));
//     }

//     const allowedUpdates = ['content', 'category', 'tags', 'visibility'];
//     const updates = {};
    
//     allowedUpdates.forEach(field => {
//       if (req.body[field] !== undefined) {
//         updates[field] = req.body[field];
//       }
//     });

//     // Handle image update
//     if (req.file) {
//       updates.image = {
//         url: req.file.path,
//         publicId: req.file.filename
//       };
//     }

//     const updatedPost = await Post.findByIdAndUpdate(
//       req.params.id,
//       updates,
//       { new: true, runValidators: true }
//     ).populate('author', 'fullName avatar role');

//     res.status(200).json(
//       successResponse(
//         { post: updatedPost },
//         'Post updated successfully',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Delete post
// router.delete('/:id', auth, async (req, res, next) => {
//   try {
//     const post = await Post.findById(req.params.id);

//     if (!post) {
//       return next(new AppError('Post not found', 404));
//     }

//     // Check ownership or admin role
//     if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
//       return next(new AppError('You can only delete your own posts', 403));
//     }

//     // Soft delete
//     post.isActive = false;
//     await post.save();

//     // Update user's post count
//     await User.findByIdAndUpdate(post.author, {
//       $inc: { 'statistics.postsCount': -1 }
//     });

//     res.status(200).json(
//       successResponse(
//         null,
//         'Post deleted successfully',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Like/Unlike post
// router.post('/:id/like', auth, async (req, res, next) => {
//   try {
//     const post = await Post.findById(req.params.id);

//     if (!post || !post.isActive) {
//       return next(new AppError('Post not found', 404));
//     }

//     const wasLiked = post.toggleLike(req.user.id);
//     await post.save();

//     // Update user statistics
//     if (wasLiked) {
//       await User.findByIdAndUpdate(post.author, {
//         $inc: { 'statistics.impactScore': 1 }
//       });
//     }

//     res.status(200).json(
//       successResponse(
//         {
//           likes: post.likes,
//           wasLiked
//         },
//         wasLiked ? 'Post liked' : 'Post unliked',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Save/Unsave post
// router.post('/:id/save', auth, async (req, res, next) => {
//   try {
//     const post = await Post.findById(req.params.id);

//     if (!post || !post.isActive) {
//       return next(new AppError('Post not found', 404));
//     }

//     const wasSaved = post.toggleSave(req.user.id);
//     await post.save();

//     res.status(200).json(
//       successResponse(
//         {
//           saved: wasSaved
//         },
//         wasSaved ? 'Post saved' : 'Post unsaved',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Add comment
// router.post('/:id/comments', auth, [
//   body('content')
//     .notEmpty()
//     .withMessage('Comment content is required')
//     .isLength({ max: 1000 })
//     .withMessage('Comment cannot exceed 1000 characters')
// ], async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return next(new AppError('Validation failed', 400, errors.array()));
//     }

//     const post = await Post.findById(req.params.id);

//     if (!post || !post.isActive) {
//       return next(new AppError('Post not found', 404));
//     }

//     post.addComment(req.user.id, req.body.content);
//     await post.save();

//     // Populate the new comment
//     await post.populate('comments.user', 'fullName avatar');

//     const newComment = post.comments[post.comments.length - 1];

//     // Update user statistics
//     await User.findByIdAndUpdate(post.author, {
//       $inc: { 'statistics.impactScore': 2 }
//     });

//     res.status(201).json(
//       successResponse(
//         { comment: newComment },
//         'Comment added successfully',
//         201
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Report post
// router.post('/:id/report', auth, [
//   body('reason')
//     .notEmpty()
//     .withMessage('Reason is required')
//     .isLength({ max: 500 })
//     .withMessage('Reason cannot exceed 500 characters')
// ], async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return next(new AppError('Validation failed', 400, errors.array()));
//     }

//     const post = await Post.findById(req.params.id);

//     if (!post || !post.isActive) {
//       return next(new AppError('Post not found', 404));
//     }

//     // Check if user already reported this post
//     const alreadyReported = post.moderation.flaggedBy.some(
//       report => report.user.toString() === req.user.id
//     );

//     if (alreadyReported) {
//       return next(new AppError('You have already reported this post', 400));
//     }

//     post.flag(req.user.id, req.body.reason);
//     await post.save();

//     res.status(200).json(
//       successResponse(
//         null,
//         'Post reported successfully',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// export default router;