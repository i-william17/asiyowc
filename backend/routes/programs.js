const express = require('express');
const Program = require('../models/Program');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// Get all programs
router.get('/', async (req, res) => {
  try {
    const { category, status } = req.query;
    let query = {};
    
    if (category) query.category = category;
    if (status) query.status = status;

    const programs = await Program.find(query)
      .populate('participants.user', 'profile firstName lastName avatar');

    res.json({
      success: true,
      data: { programs }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Enroll in program
router.post('/:id/enroll', async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Check if already enrolled
    const alreadyEnrolled = program.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (alreadyEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this program'
      });
    }

    program.participants.push({
      user: req.user.id,
      enrolledAt: new Date()
    });

    await program.save();

    res.json({
      success: true,
      message: 'Successfully enrolled in program'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

// import express from 'express';
// import { body, validationResult } from 'express-validator';
// import Program from '../models/Program.js';
// import User from '../models/User.js';
// import { auth, restrictTo } from '../middleware/auth.js';
// import AppError from '../utils/AppError.js';
// import { successResponse } from '../middleware/responseFormatter.js';

// const router = express.Router();

// // Validation middleware
// const validateProgram = [
//   body('title')
//     .notEmpty()
//     .withMessage('Program title is required')
//     .isLength({ max: 200 })
//     .withMessage('Title cannot exceed 200 characters'),
//   body('description')
//     .notEmpty()
//     .withMessage('Program description is required')
//     .isLength({ max: 2000 })
//     .withMessage('Description cannot exceed 2000 characters'),
//   body('category')
//     .isIn(['leadership', 'finance', 'wellness', 'advocacy', 'entrepreneurship', 'education'])
//     .withMessage('Invalid category'),
//   body('duration')
//     .notEmpty()
//     .withMessage('Duration is required'),
//   body('level')
//     .isIn(['beginner', 'intermediate', 'advanced'])
//     .withMessage('Invalid level')
// ];

// // Get all programs
// router.get('/', async (req, res, next) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const category = req.query.category;
//     const level = req.query.level;
//     const skip = (page - 1) * limit;

//     // Build query
//     let query = { status: 'published' };
    
//     if (category && category !== 'all') {
//       query.category = category;
//     }
    
//     if (level && level !== 'all') {
//       query.level = level;
//     }

//     const programs = await Program.find(query)
//       .populate('mentor', 'fullName avatar role bio')
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     // Add enrollment status for authenticated users
//     if (req.user) {
//       programs.forEach(program => {
//         program.isEnrolled = program.enrolledUsers.some(
//           enrollment => enrollment.user.toString() === req.user.id
//         );
//         program.isCompleted = program.enrolledUsers.some(
//           enrollment => enrollment.user.toString() === req.user.id && enrollment.completedAt
//         );
//         program.myProgress = program.enrolledUsers.find(
//           enrollment => enrollment.user.toString() === req.user.id
//         )?.progress || 0;
//       });
//     }

//     const total = await Program.countDocuments(query);

//     res.status(200).json(
//       successResponse(
//         {
//           programs,
//           pagination: {
//             page,
//             limit,
//             total,
//             pages: Math.ceil(total / limit)
//           }
//         },
//         'Programs retrieved successfully',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Get featured programs
// router.get('/featured', async (req, res, next) => {
//   try {
//     const limit = parseInt(req.query.limit) || 5;

//     const programs = await Program.find({
//       status: 'published',
//       isFeatured: true
//     })
//       .populate('mentor', 'fullName avatar role bio')
//       .limit(limit)
//       .lean();

//     // Add enrollment status for authenticated users
//     if (req.user) {
//       programs.forEach(program => {
//         program.isEnrolled = program.enrolledUsers.some(
//           enrollment => enrollment.user.toString() === req.user.id
//         );
//       });
//     }

//     res.status(200).json(
//       successResponse(
//         { programs },
//         'Featured programs retrieved successfully',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Get single program
// router.get('/:id', async (req, res, next) => {
//   try {
//     const program = await Program.findById(req.params.id)
//       .populate('mentor', 'fullName avatar role bio socialLinks')
//       .populate('enrolledUsers.user', 'fullName avatar');

//     if (!program) {
//       return next(new AppError('Program not found', 404));
//     }

//     // Add enrollment status for authenticated users
//     if (req.user) {
//       program.isEnrolled = program.enrolledUsers.some(
//         enrollment => enrollment.user.toString() === req.user.id
//       );
//       program.isCompleted = program.enrolledUsers.some(
//         enrollment => enrollment.user.toString() === req.user.id && enrollment.completedAt
//       );
      
//       const userEnrollment = program.enrolledUsers.find(
//         enrollment => enrollment.user.toString() === req.user.id
//       );
//       program.myProgress = userEnrollment?.progress || 0;
//       program.myEnrollment = userEnrollment;
//     }

//     res.status(200).json(
//       successResponse(
//         { program },
//         'Program retrieved successfully',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Create program (Mentors only)
// router.post('/', auth, restrictTo('mentor'), validateProgram, async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return next(new AppError('Validation failed', 400, errors.array()));
//     }

//     const programData = {
//       ...req.body,
//       mentor: req.user.id
//     };

//     const program = await Program.create(programData);
//     await program.populate('mentor', 'fullName avatar role bio');

//     res.status(201).json(
//       successResponse(
//         { program },
//         'Program created successfully',
//         201
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Update program
// router.patch('/:id', auth, validateProgram, async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return next(new AppError('Validation failed', 400, errors.array()));
//     }

//     const program = await Program.findById(req.params.id);

//     if (!program) {
//       return next(new AppError('Program not found', 404));
//     }

//     // Check if user is the program mentor or admin
//     if (program.mentor.toString() !== req.user.id && req.user.role !== 'admin') {
//       return next(new AppError('You can only update your own programs', 403));
//     }

//     const allowedUpdates = [
//       'title', 'description', 'shortDescription', 'category', 'duration', 
//       'level', 'price', 'modules', 'requirements', 'learningOutcomes',
//       'maxParticipants', 'status', 'startDate', 'endDate', 'isFeatured'
//     ];

//     const updates = {};
//     allowedUpdates.forEach(field => {
//       if (req.body[field] !== undefined) {
//         updates[field] = req.body[field];
//       }
//     });

//     const updatedProgram = await Program.findByIdAndUpdate(
//       req.params.id,
//       updates,
//       { new: true, runValidators: true }
//     ).populate('mentor', 'fullName avatar role bio');

//     res.status(200).json(
//       successResponse(
//         { program: updatedProgram },
//         'Program updated successfully',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Enroll in program
// router.post('/:id/enroll', auth, async (req, res, next) => {
//   try {
//     const program = await Program.findById(req.params.id);

//     if (!program) {
//       return next(new AppError('Program not found', 404));
//     }

//     if (program.status !== 'published') {
//       return next(new AppError('Program is not available for enrollment', 400));
//     }

//     try {
//       program.enrollUser(req.user.id);
//       await program.save();

//       // Update user statistics
//       await User.findByIdAndUpdate(req.user.id, {
//         $inc: { 'statistics.programsCompleted': 0.1 } // Partial completion
//       });

//       res.status(200).json(
//         successResponse(
//           null,
//           'Successfully enrolled in program',
//           200
//         )
//       );
//     } catch (enrollmentError) {
//       return next(new AppError(enrollmentError.message, 400));
//     }
//   } catch (error) {
//     next(error);
//   }
// });

// // Update progress
// router.patch('/:id/progress', auth, [
//   body('progress')
//     .isInt({ min: 0, max: 100 })
//     .withMessage('Progress must be between 0 and 100'),
//   body('moduleId')
//     .optional()
//     .isMongoId()
//     .withMessage('Invalid module ID')
// ], async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return next(new AppError('Validation failed', 400, errors.array()));
//     }

//     const program = await Program.findById(req.params.id);

//     if (!program) {
//       return next(new AppError('Program not found', 404));
//     }

//     try {
//       program.updateProgress(req.user.id, req.body.progress);
//       await program.save();

//       // Update user statistics if completed
//       if (req.body.progress >= 100) {
//         await User.findByIdAndUpdate(req.user.id, {
//           $inc: { 
//             'statistics.programsCompleted': 1,
//             'statistics.impactScore': 50
//           }
//         });

//         // Add completion badge
//         const user = await User.findById(req.user.id);
//         await user.addBadge('educator');
//       }

//       res.status(200).json(
//         successResponse(
//           { progress: req.body.progress },
//           'Progress updated successfully',
//           200
//         )
//       );
//     } catch (progressError) {
//       return next(new AppError(progressError.message, 400));
//     }
//   } catch (error) {
//     next(error);
//   }
// });

// // Get user's enrolled programs
// router.get('/user/enrolled', auth, async (req, res, next) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;

//     const programs = await Program.find({
//       'enrolledUsers.user': req.user.id
//     })
//       .populate('mentor', 'fullName avatar role')
//       .sort({ 'enrolledUsers.enrolledAt': -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     // Add user-specific data
//     programs.forEach(program => {
//       const enrollment = program.enrolledUsers.find(
//         e => e.user.toString() === req.user.id
//       );
//       program.myProgress = enrollment?.progress || 0;
//       program.enrolledAt = enrollment?.enrolledAt;
//       program.completedAt = enrollment?.completedAt;
//       program.isCompleted = !!enrollment?.completedAt;
//     });

//     const total = await Program.countDocuments({
//       'enrolledUsers.user': req.user.id
//     });

//     res.status(200).json(
//       successResponse(
//         {
//           programs,
//           pagination: {
//             page,
//             limit,
//             total,
//             pages: Math.ceil(total / limit)
//           }
//         },
//         'Enrolled programs retrieved successfully',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Rate program
// router.post('/:id/rate', auth, [
//   body('rating')
//     .isInt({ min: 1, max: 5 })
//     .withMessage('Rating must be between 1 and 5')
// ], async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return next(new AppError('Validation failed', 400, errors.array()));
//     }

//     const program = await Program.findById(req.params.id);

//     if (!program) {
//       return next(new AppError('Program not found', 404));
//     }

//     // Check if user has completed the program
//     const userEnrollment = program.enrolledUsers.find(
//       enrollment => enrollment.user.toString() === req.user.id && enrollment.completedAt
//     );

//     if (!userEnrollment) {
//       return next(new AppError('You must complete the program before rating it', 400));
//     }

//     program.addRating(req.body.rating);
//     await program.save();

//     res.status(200).json(
//       successResponse(
//         {
//           averageRating: program.ratings.average,
//           totalRatings: program.ratings.count
//         },
//         'Program rated successfully',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// export default router;