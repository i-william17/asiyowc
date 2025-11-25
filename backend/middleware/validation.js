const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email required')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),

  body('phone')
    .matches(/^\+?[0-9\s-()]{7,20}$/)
    .withMessage('Valid phone number required'),

  body('profile.fullName')
    .notEmpty()
    .withMessage('Full name is required'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email required')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const postValidation = [
  body('content.text')
    .notEmpty()
    .withMessage('Post content is required'),

  body('category')
    .isIn(['Leadership', 'Finance', 'Wellness', 'Advocacy', 'Legacy', 'General'])
    .withMessage('Invalid post category'),
];

const programValidation = [
  body('title')
    .notEmpty()
    .withMessage('Program title is required'),

  body('category')
    .isIn(['Leadership', 'Finance', 'Wellness', 'Advocacy', 'Education', 'Business'])
    .withMessage('Invalid program category'),
];

module.exports = {
  handleValidationErrors,
  registerValidation,
  loginValidation,
  postValidation,
  programValidation
};
