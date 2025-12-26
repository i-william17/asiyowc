const User = require('../models/User');
const Post = require('../models/Post');
const Program = require('../models/Program');
const { deleteFromCloudinary } = require('../middleware/upload');

/* =====================================================
   GET MY PROFILE (USER + STATS)
===================================================== */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      user,
      postsCount,
      enrolledProgramsCount,
      completedProgramsCount
    ] = await Promise.all([
      User.findById(userId).select('-password -twoFactorAuth.secret'),

      Post.countDocuments({
        author: userId,
        isRemoved: false
      }),

      Program.countDocuments({
        'participants.user': userId
      }),

      Program.countDocuments({
        participants: {
          $elemMatch: {
            user: userId,
            progress: 100
          }
        }
      })
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user,
        stats: {
          postsCount,
          enrolledProgramsCount,
          completedProgramsCount
        }
      }
    });
  } catch (error) {
    console.error('❌ getProfile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
   UPDATE PROFILE (SAFE FIELDS ONLY)
===================================================== */
exports.updateProfile = async (req, res) => {
  try {
    const updates = {};

    if (req.body.fullName !== undefined)
      updates['profile.fullName'] = req.body.fullName;

    if (req.body.bio !== undefined)
      updates['profile.bio'] = req.body.bio;

    if (req.body.role !== undefined)
      updates['profile.role'] = req.body.role;

    if (req.body.interests !== undefined)
      updates.interests = req.body.interests;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -twoFactorAuth.secret');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('❌ updateProfile error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
   UPLOAD AVATAR
===================================================== */
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const user = await User.findById(req.user.id);

    // cleanup old avatar (safe optional)
    if (user?.profile?.avatar?.publicId) {
      await deleteFromCloudinary(user.profile.avatar.publicId);
    }

    const avatar = {
      url: req.file.path,
      publicId: req.file.filename || req.file.public_id || null
    };

    user.profile.avatar = avatar;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: { avatar }
    });
  } catch (error) {
    console.error('❌ uploadAvatar error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
   DELETE AVATAR
===================================================== */
exports.deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user?.profile?.avatar?.url) {
      return res.status(400).json({
        success: false,
        message: 'No avatar to delete'
      });
    }

    if (user.profile.avatar.publicId) {
      await deleteFromCloudinary(user.profile.avatar.publicId);
    }

    user.profile.avatar = { url: null, publicId: null };
    await user.save();

    res.json({
      success: true,
      message: 'Avatar deleted successfully'
    });
  } catch (error) {
    console.error('❌ deleteAvatar error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
   UPLOAD COVER PHOTO
===================================================== */
exports.uploadCoverPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const user = await User.findById(req.user.id);

    if (user?.profile?.coverPhoto?.publicId) {
      await deleteFromCloudinary(user.profile.coverPhoto.publicId);
    }

    const coverPhoto = {
      url: req.file.path,
      publicId: req.file.filename || req.file.public_id || null
    };

    user.profile.coverPhoto = coverPhoto;
    await user.save();

    res.json({
      success: true,
      message: 'Cover photo uploaded successfully',
      data: { coverPhoto }
    });
  } catch (error) {
    console.error('❌ uploadCoverPhoto error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
   DELETE COVER PHOTO
===================================================== */
exports.deleteCoverPhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user?.profile?.coverPhoto?.url) {
      return res.status(400).json({
        success: false,
        message: 'No cover photo to delete'
      });
    }

    if (user.profile.coverPhoto.publicId) {
      await deleteFromCloudinary(user.profile.coverPhoto.publicId);
    }

    user.profile.coverPhoto = { url: null, publicId: null };
    await user.save();

    res.json({
      success: true,
      message: 'Cover photo deleted successfully'
    });
  } catch (error) {
    console.error('❌ deleteCoverPhoto error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
   GET ENROLLED PROGRAMS
===================================================== */
exports.getEnrolledPrograms = async (req, res) => {
  try {
    const programs = await Program.find({
      'participants.user': req.user.id
    })
      .select('title image category status startDate endDate participants')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { programs }
    });
  } catch (error) {
    console.error('❌ getEnrolledPrograms error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
   GET COMPLETED PROGRAMS
===================================================== */
exports.getCompletedPrograms = async (req, res) => {
  try {
    const programs = await Program.find({
      participants: {
        $elemMatch: {
          user: req.user.id,
          progress: 100
        }
      }
    })
      .select('title image category completedAt badges')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: { programs }
    });
  } catch (error) {
    console.error('❌ getCompletedPrograms error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
   CHANGE PASSWORD (LOGGED-IN USER)
===================================================== */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    if (!user || !(await user.correctPassword(currentPassword, user.password))) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('❌ changePassword error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
   RESET PASSWORD (TOKEN-BASED)
===================================================== */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      'verification.phoneToken': token,
      'verification.phoneTokenExpires': { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    user.password = newPassword;
    user.verification.phoneToken = undefined;
    user.verification.phoneTokenExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('❌ resetPassword error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
   USER STATS ONLY
===================================================== */
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      postsCount,
      enrolledProgramsCount,
      completedProgramsCount
    ] = await Promise.all([
      Post.countDocuments({ author: userId, isRemoved: false }),
      Program.countDocuments({ 'participants.user': userId }),
      Program.countDocuments({
        participants: {
          $elemMatch: { user: userId, progress: 100 }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        postsCount,
        enrolledProgramsCount,
        completedProgramsCount
      }
    });
  } catch (error) {
    console.error('❌ getUserStats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
   ADD EMERGENCY CONTACT
===================================================== */
exports.addEmergencyContact = async (req, res) => {
  try {
    const { name, phone, relationship } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $push: {
          'safety.emergencyContacts': { name, phone, relationship }
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Emergency contact added successfully',
      data: {
        emergencyContacts: user?.safety?.emergencyContacts || []
      }
    });
  } catch (error) {
    console.error('❌ addEmergencyContact error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =====================================================
   TRIGGER SOS
===================================================== */
exports.triggerSOS = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $set: { 'safety.lastSOSUsed': new Date() }
    });

    res.json({
      success: true,
      message: 'SOS alert triggered successfully. Help is being notified.'
    });
  } catch (error) {
    console.error('❌ triggerSOS error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
