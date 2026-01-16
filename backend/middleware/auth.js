const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
const AppError = require('../utils/AppError.js');

/* ==========================================================
   AUTHENTICATION MIDDLEWARE (REQUIRES LOGIN)
========================================================== */
const auth = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // OR get token from cookies (optional)
    else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    // TOKEN MISSING
    if (!token) {
      return next(new AppError('Please log in to access this resource', 401));
    }

    // VERIFY TOKEN
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // FIND USER
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists', 401));
    }

    // CHECK IF USER IS ACTIVE
    if (!currentUser.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact support.', 403));
    }

    // CHECK IF PASSWORD CHANGED AFTER TOKEN ISSUED
    if (currentUser.changedPasswordAfter && currentUser.changedPasswordAfter(decoded.iat)) {
      return next(new AppError('User recently changed password. Please log in again.', 401));
    }
console.log("AUTH HIT:", req.method, req.originalUrl);
    /* ==========================================================
       ⭐ NORMALIZED USER OBJECT — ALWAYS CONSISTENT
       All controllers now rely only on:
       - req.user.id
       - req.user.role
       - req.user._id (alias)
    =========================================================== */
    req.user = {
      id: currentUser._id.toString(),
      _id: currentUser._id.toString(),
      role: currentUser.role,
      isActive: currentUser.isActive,
      profile: currentUser.profile
    };

    // console.log("🔐 AUTH → User attached:", req.user);

    next();
  } catch (error) {
    console.error('❌ AUTH ERROR:', error);
    return next(new AppError('Invalid or expired token', 401));
  }
};


/* ==========================================================
   OPTIONAL AUTH — ALLOW BOTH GUEST & LOGGED USERS
========================================================== */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);

    if (
      currentUser &&
      (!currentUser.changedPasswordAfter || !currentUser.changedPasswordAfter(decoded.iat)) &&
      currentUser.isActive
    ) {
      req.user = {
        id: currentUser._id.toString(),
        _id: currentUser._id.toString(),
        role: currentUser.role,
        isActive: currentUser.isActive,
        profile: currentUser.profile
      };

      console.log("🔐 OPTIONAL AUTH → User attached:", req.user);
    }

    next();
  } catch (error) {
    next(); // allow guest
  }
};


/* ==========================================================
   ROLE-BASED ACCESS CONTROL
========================================================== */
const restrictTo = (...roles) => {
  return async (req, res, next) => {
    const user = await User.findById(req.user.id);

    if (!user || !roles.includes(user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
};

const isModerator = restrictTo('moderator', 'admin');
const isAdmin = restrictTo('admin');


/* ==========================================================
   EXPORTS
========================================================== */
module.exports = {
  auth,
  optionalAuth,
  restrictTo,
  isModerator,
  isAdmin
};
