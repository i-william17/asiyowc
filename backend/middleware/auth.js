const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
const AppError = require('../utils/AppError.js');

const auth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('Please log in to access this resource', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists', 401));
    }

    // Check if user changed password after token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(new AppError('User recently changed password. Please log in again.', 401));
    }

    // Check if user is active
    if (!currentUser.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact support.', 403));
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    return next(new AppError('Invalid token', 401));
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);

      if (currentUser && !currentUser.changedPasswordAfter(decoded.iat) && currentUser.isActive) {
        req.user = currentUser;
      }
    }

    next();
  } catch (error) {
    next();
  }
};

// Moderator and admin authorization
const isModerator = restrictTo('moderator', 'admin');
const isAdmin = restrictTo('admin');

module.exports = {
  auth,
  restrictTo,
  optionalAuth,
  isModerator,
  isAdmin
};
