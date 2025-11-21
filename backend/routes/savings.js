const express = require('express');
const SavingsPod = require('../models/SavingsPod');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// Get user's savings pods
router.get('/', async (req, res) => {
  try {
    const pods = await SavingsPod.find({
      'members.user': req.user.id
    }).populate('members.user', 'profile firstName lastName avatar');

    res.json({
      success: true,
      data: { pods }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create savings pod
router.post('/', async (req, res) => {
  try {
    const { name, description, goal, rules } = req.body;

    const pod = await SavingsPod.create({
      name,
      description,
      goal,
      rules,
      members: [{
        user: req.user.id,
        role: 'admin'
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Savings pod created successfully',
      data: { pod }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add contribution
router.post('/:id/contribute', async (req, res) => {
  try {
    const { amount } = req.body;
    const pod = await SavingsPod.findById(req.params.id);

    if (!pod) {
      return res.status(404).json({
        success: false,
        message: 'Savings pod not found'
      });
    }

    pod.contributions.push({
      user: req.user.id,
      amount: parseFloat(amount)
    });

    // Update progress
    pod.updateProgress();
    await pod.save();

    res.json({
      success: true,
      message: 'Contribution added successfully'
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
// import SavingsPod from '../models/SavingsPod.js';
// import User from '../models/User.js';
// import { auth } from '../middleware/auth.js';
// import AppError from '../utils/AppError.js';
// import { successResponse } from '../middleware/responseFormatter.js';

// const router = express.Router();

// // Validation middleware
// const validateSavingsPod = [
//   body('name')
//     .notEmpty()
//     .withMessage('Pod name is required')
//     .isLength({ max: 100 })
//     .withMessage('Name cannot exceed 100 characters'),
//   body('description')
//     .optional()
//     .isLength({ max: 500 })
//     .withMessage('Description cannot exceed 500 characters'),
//   body('category')
//     .isIn(['emergency', 'investment', 'education', 'business', 'personal', 'group'])
//     .withMessage('Invalid category'),
//   body('goal.targetAmount')
//     .isFloat({ min: 0 })
//     .withMessage('Target amount must be a positive number'),
//   body('contributionSettings.amount')
//     .isFloat({ min: 0 })
//     .withMessage('Contribution amount must be a positive number'),
//   body('contributionSettings.frequency')
//     .isIn(['daily', 'weekly', 'monthly', 'custom'])
//     .withMessage('Invalid contribution frequency')
// ];

// // Get all savings pods
// router.get('/', auth, async (req, res, next) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const category = req.query.category;
//     const skip = (page - 1) * limit;

//     // Build query
//     let query = { status: 'active' };
    
//     if (category && category !== 'all') {
//       query.category = category;
//     }

//     const pods = await SavingsPod.find(query)
//       .populate('creator', 'fullName avatar')
//       .populate('members.user', 'fullName avatar')
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     // Add user-specific data
//     pods.forEach(pod => {
//       pod.isMember = pod.members.some(
//         member => member.user._id.toString() === req.user.id && member.isActive
//       );
//       pod.isAdmin = pod.members.some(
//         member => member.user._id.toString() === req.user.id && member.role === 'admin'
//       );
//       pod.myBalance = pod.getMemberBalance(req.user.id);
//     });

//     const total = await SavingsPod.countDocuments(query);

//     res.status(200).json(
//       successResponse(
//         {
//           pods,
//           pagination: {
//             page,
//             limit,
//             total,
//             pages: Math.ceil(total / limit)
//           }
//         },
//         'Savings pods retrieved successfully',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Get user's savings pods
// router.get('/my-pods', auth, async (req, res, next) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;

//     const pods = await SavingsPod.find({
//       'members.user': req.user.id,
//       'members.isActive': true
//     })
//       .populate('creator', 'fullName avatar')
//       .populate('members.user', 'fullName avatar')
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     // Add user-specific data
//     pods.forEach(pod => {
//       pod.isAdmin = pod.members.some(
//         member => member.user._id.toString() === req.user.id && member.role === 'admin'
//       );
//       pod.myBalance = pod.getMemberBalance(req.user.id);
//       pod.myContributions = pod.contributions
//         .filter(contribution => contribution.member.toString() === req.user.id)
//         .reduce((sum, contribution) => sum + contribution.amount, 0);
//     });

//     const total = await SavingsPod.countDocuments({
//       'members.user': req.user.id,
//       'members.isActive': true
//     });

//     res.status(200).json(
//       successResponse(
//         {
//           pods,
//           pagination: {
//             page,
//             limit,
//             total,
//             pages: Math.ceil(total / limit)
//           }
//         },
//         'Your savings pods retrieved successfully',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Get single savings pod
// router.get('/:id', auth, async (req, res, next) => {
//   try {
//     const pod = await SavingsPod.findById(req.params.id)
//       .populate('creator', 'fullName avatar')
//       .populate('members.user', 'fullName avatar')
//       .populate('contributions.member', 'fullName avatar')
//       .populate('withdrawals.member', 'fullName avatar')
//       .populate('withdrawals.approvedBy', 'fullName avatar');

//     if (!pod) {
//       return next(new AppError('Savings pod not found', 404));
//     }

//     // Check if user is a member (unless pod is public)
//     if (pod.settings.privacy !== 'public' && !pod.isUserParticipant(req.user.id)) {
//       return next(new AppError('You do not have permission to view this pod', 403));
//     }

//     // Add user-specific data
//     pod.isMember = pod.isUserParticipant(req.user.id);
//     pod.isAdmin = pod.members.some(
//       member => member.user._id.toString() === req.user.id && member.role === 'admin'
//     );
//     pod.myBalance = pod.getMemberBalance(req.user.id);

//     res.status(200).json(
//       successResponse(
//         { pod },
//         'Savings pod retrieved successfully',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Create savings pod
// router.post('/', auth, validateSavingsPod, async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return next(new AppError('Validation failed', 400, errors.array()));
//     }

//     const podData = {
//       ...req.body,
//       creator: req.user.id
//     };

//     const pod = await SavingsPod.create(podData);

//     // Add creator as admin member
//     pod.addMember(req.user.id, 'admin');
//     await pod.save();

//     await pod.populate('creator', 'fullName avatar');
//     await pod.populate('members.user', 'fullName avatar');

//     // Update user statistics
//     await User.findByIdAndUpdate(req.user.id, {
//       $inc: { 'statistics.totalContributions': 0 }
//     });

//     res.status(201).json(
//       successResponse(
//         { pod },
//         'Savings pod created successfully',
//         201
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// // Join savings pod
// router.post('/:id/join', auth, async (req, res, next) => {
//   try {
//     const pod = await SavingsPod.findById(req.params.id);

//     if (!pod) {
//       return next(new AppError('Savings pod not found', 404));
//     }

//     if (pod.status !== 'active') {
//       return next(new AppError('Pod is not currently accepting members', 400));
//     }

//     if (pod.settings.privacy === 'private') {
//       return next(new AppError('This pod is private and requires an invitation', 403));
//     }

//     try {
//       pod.addMember(req.user.id);
//       await pod.save();

//       res.status(200).json(
//         successResponse(
//           null,
//           'Successfully joined savings pod',
//           200
//         )
//       );
//     } catch (joinError) {
//       return next(new AppError(joinError.message, 400));
//     }
//   } catch (error) {
//     next(error);
//   }
// });

// // Make contribution
// router.post('/:id/contribute', auth, [
//   body('amount')
//     .isFloat({ min: 0 })
//     .withMessage('Amount must be a positive number'),
//   body('method')
//     .optional()
//     .isIn(['mpesa', 'bank', 'cash', 'mobile'])
//     .withMessage('Invalid payment method')
// ], async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return next(new AppError('Validation failed', 400, errors.array()));
//     }

//     const pod = await SavingsPod.findById(req.params.id);

//     if (!pod) {
//       return next(new AppError('Savings pod not found', 404));
//     }

//     if (!pod.isUserParticipant(req.user.id)) {
//       return next(new AppError('You are not a member of this pod', 403));
//     }

//     try {
//       pod.addContribution(req.user.id, req.body.amount, req.body.method || 'mpesa');
//       await pod.save();

//       // Update user statistics
//       await User.findByIdAndUpdate(req.user.id, {
//         $inc: { 
//           'statistics.totalContributions': req.body.amount,
//           'statistics.impactScore': Math.floor(req.body.amount / 100) // 1 point per 100 units
//         }
//       });

//       // Check if goal is reached
//       if (pod.currentBalance >= pod.goal.targetAmount) {
//         // Notify members and update statistics
//         await User.updateMany(
//           { _id: { $in: pod.members.map(m => m.user) } },
//           { $inc: { 'statistics.impactScore': 100 } }
//         );
//       }

//       res.status(200).json(
//         successResponse(
//           {
//             newBalance: pod.currentBalance,
//             memberBalance: pod.getMemberBalance(req.user.id)
//           },
//           'Contribution made successfully',
//           200
//         )
//       );
//     } catch (contributionError) {
//       return next(new AppError(contributionError.message, 400));
//     }
//   } catch (error) {
//     next(error);
//   }
// });

// // Request withdrawal
// router.post('/:id/withdraw', auth, [
//   body('amount')
//     .isFloat({ min: 0 })
//     .withMessage('Amount must be a positive number'),
//   body('purpose')
//     .notEmpty()
//     .withMessage('Purpose is required')
//     .isLength({ max: 500 })
//     .withMessage('Purpose cannot exceed 500 characters')
// ], async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return next(new AppError('Validation failed', 400, errors.array()));
//     }

//     const pod = await SavingsPod.findById(req.params.id);

//     if (!pod) {
//       return next(new AppError('Savings pod not found', 404));
//     }

//     if (!pod.isUserParticipant(req.user.id)) {
//       return next(new AppError('You are not a member of this pod', 403));
//     }

//     try {
//       pod.requestWithdrawal(req.user.id, req.body.amount, req.body.purpose);
//       await pod.save();

//       res.status(200).json(
//         successResponse(
//           null,
//           'Withdrawal request submitted successfully',
//           200
//         )
//       );
//     } catch (withdrawalError) {
//       return next(new AppError(withdrawalError.message, 400));
//     }
//   } catch (error) {
//     next(error);
//   }
// });

// // Get pod contributions
// router.get('/:id/contributions', auth, async (req, res, next) => {
//   try {
//     const pod = await SavingsPod.findById(req.params.id)
//       .populate('contributions.member', 'fullName avatar');

//     if (!pod) {
//       return next(new AppError('Savings pod not found', 404));
//     }

//     if (!pod.isUserParticipant(req.user.id)) {
//       return next(new AppError('You are not a member of this pod', 403));
//     }

//     const userContributions = pod.contributions.filter(
//       contribution => contribution.member._id.toString() === req.user.id
//     );

//     res.status(200).json(
//       successResponse(
//         {
//           contributions: userContributions,
//           totalContributions: userContributions.reduce((sum, c) => sum + c.amount, 0)
//         },
//         'Contributions retrieved successfully',
//         200
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// });

// export default router;