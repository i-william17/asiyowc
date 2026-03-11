const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 5 attempts
  message: {
    success: false,
    message: 'Too many attempts, Please try again later in 15 minutes.'
  }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20 // 100 requests per windowMs
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20 // 10 requests per windowMs
});

module.exports = {
  authLimiter,
  generalLimiter,
  strictLimiter
};