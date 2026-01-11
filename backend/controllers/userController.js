const User = require('../models/User');
const Post = require('../models/Post');
const Program = require('../models/Program');
const { deleteFromCloudinary } = require('../middleware/upload');
const cloudinary = require("cloudinary").v2;

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -twoFactorAuth.secret')
      .sort({ 'profile.fullName': 1 });

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('❌ getAllUsers error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
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
    const userId = req.user.id;
    const updates = {};

    const {
      fullName,
      email,
      bio,
      role,
      interests,
      location,
      safety,
      profile // 👈 allow nested payloads
    } = req.body;

    console.log('👤 REQUEST BODY:', req.body);

    /* =====================================================
       BASIC PROFILE
    ===================================================== */
    if (typeof fullName === "string" && fullName.trim()) {
      updates["profile.fullName"] = fullName.trim();
    }

    if (typeof bio === "string") {
      updates["profile.bio"] = bio.trim();
    }

    if (typeof role === "string" && role.trim()) {
      updates["profile.role"] = role.toLowerCase().trim();
    }

    /* =====================================================
       INTERESTS (CANONICAL PATH)
       accepts:
       - interests: [...]
       - profile.interests: [...]
    ===================================================== */
    const resolvedInterests =
      Array.isArray(interests)
        ? interests
        : Array.isArray(profile?.interests)
        ? profile.interests
        : null;

    if (resolvedInterests) {
      updates["interests"] = resolvedInterests
        .map(i => i.toLowerCase().trim())
        .filter(Boolean);
    }

    /* =====================================================
       LOCATION (SAFE — NEVER WRITE EMPTY VALUES)
    ===================================================== */
    const resolvedLocation =
      location && typeof location === "object"
        ? location
        : profile?.location;

    if (resolvedLocation) {
      if (typeof resolvedLocation.country === "string" && resolvedLocation.country.trim()) {
        updates["profile.location.country"] = resolvedLocation.country.trim();
      }

      if (
        typeof resolvedLocation.countryCode === "string" &&
        resolvedLocation.countryCode.trim().length >= 2
      ) {
        updates["profile.location.countryCode"] =
          resolvedLocation.countryCode.trim();
      }

      if (typeof resolvedLocation.city === "string" && resolvedLocation.city.trim()) {
        updates["profile.location.city"] = resolvedLocation.city.trim();
      }
    }

    /* =====================================================
       EMERGENCY CONTACTS (CANONICAL PATH)
       accepts:
       - safety.emergencyContacts
       - profile.safety.emergencyContacts
    ===================================================== */
    const resolvedEmergencyContacts =
      Array.isArray(safety?.emergencyContacts)
        ? safety.emergencyContacts
        : Array.isArray(profile?.safety?.emergencyContacts)
        ? profile.safety.emergencyContacts
        : null;

    if (resolvedEmergencyContacts) {
      updates["safety.emergencyContacts"] =
        resolvedEmergencyContacts.map(c => ({
          name: typeof c?.name === "string" ? c.name.trim() : "",
          phone: typeof c?.phone === "string" ? c.phone.trim() : "",
          relationship:
            typeof c?.relationship === "string" && c.relationship.trim()
              ? c.relationship.trim()
              : "Other",
        }));
    }

    /* =====================================================
       EMAIL (UNIQUE)
    ===================================================== */
    if (typeof email === "string" && email.trim()) {
      updates["email"] = email.toLowerCase().trim();
    }

    /* =====================================================
       APPLY UPDATE
    ===================================================== */
    if (Object.keys(updates).length === 0) {
      return res.json({
        success: true,
        message: "No changes detected",
        data: {}
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password -twoFactorAuth.secret");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user }
    });

  } catch (error) {
    console.error("❌ updateProfile error:", error.message);

    return res.status(500).json({
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
        message: "Please upload an image",
      });
    }

    const user = await User.findById(req.user.id);

    if (user?.profile?.avatar?.publicId) {
      await deleteFromCloudinary(user.profile.avatar.publicId);
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "asiyo-app",
      resource_type: "image",
    });

    const avatar = {
      url: result.secure_url,
      publicId: result.public_id,
    };

    // 🔒 ATOMIC UPDATE — NO FULL VALIDATION
    await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          "profile.avatar": avatar,
        },
      },
      {
        runValidators: false,
      }
    );

    return res.json({
      success: true,
      message: "Avatar uploaded successfully",
      data: { avatar },
    });
  } catch (error) {
    console.error("❌ uploadAvatar error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Avatar upload failed",
      error: error.message,
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
        message: "Please upload an image",
      });
    }

    const user = await User.findById(req.user.id);

    if (user?.profile?.coverPhoto?.publicId) {
      try {
        await deleteFromCloudinary(user.profile.coverPhoto.publicId);
      } catch {
        console.log("[Cloudinary] Old cover cleanup failed");
      }
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "asiyo-app",
      resource_type: "image",
    });

    const coverPhoto = {
      url: result.secure_url,
      publicId: result.public_id,
    };

    // 🔒 ATOMIC UPDATE — NO FULL VALIDATION
    await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          "profile.coverPhoto": coverPhoto,
        },
      },
      {
        runValidators: false,
      }
    );

    return res.json({
      success: true,
      message: "Cover photo uploaded successfully",
      data: { coverPhoto },
    });
  } catch (error) {
    console.error("❌ uploadCoverPhoto error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Cover photo upload failed",
      error: error.message,
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
