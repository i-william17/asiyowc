const User = require('../models/User');
const Post = require('../models/Post');
const Program = require('../models/Program');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('profile.badges')
      .select('-password -auth.twoFactorSecret');

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { profile, preferences } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { profile, preferences } },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 'profile.avatar': req.file.path },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: { avatar: user.profile.avatar }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [postsCount, programsEnrolled, connectionsCount] = await Promise.all([
      Post.countDocuments({ author: userId }),
      Program.countDocuments({ 'participants.user': userId }),
      User.countDocuments({ _id: { $ne: userId } }) // Simplified for demo
    ]);

    const impactScore = (postsCount * 2) + (programsEnrolled * 5) + (connectionsCount * 3);

    res.json({
      success: true,
      data: {
        postsCount,
        programsEnrolled,
        connectionsCount,
        impactScore
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.addEmergencyContact = async (req, res) => {
  try {
    const { contact } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $push: { 'safety.emergencyContacts': contact } },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Emergency contact added successfully',
      data: { emergencyContacts: user.safety.emergencyContacts }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.triggerSOS = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Update last SOS used
    user.safety.lastSOSUsed = new Date();
    await user.save();

    // In a real implementation, this would:
    // 1. Send SMS/email to emergency contacts
    // 2. Notify nearby volunteers
    // 3. Connect to emergency services

    res.json({
      success: true,
      message: 'SOS alert activated. Help is on the way.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};