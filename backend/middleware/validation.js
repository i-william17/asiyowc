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
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('profile.firstName').notEmpty(),
  body('profile.lastName').notEmpty()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

const postValidation = [
  body('content.text').notEmpty().withMessage('Post content is required'),
  body('category').isIn(['Leadership', 'Finance', 'Wellness', 'Advocacy', 'Legacy', 'General'])
];

const programValidation = [
  body('title').notEmpty(),
  body('category').isIn(['Leadership', 'Finance', 'Wellness', 'Advocacy', 'Education', 'Business'])
];

module.exports = {
  handleValidationErrors,
  registerValidation,
  loginValidation,
  postValidation,
  programValidation
};