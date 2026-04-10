// In utils/validators.js

const { body, param, validationResult } = require('express-validator');

// Helper to handle validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

const storeValidationRules = {
  // For routes with :id parameter
  getById: [
    param('id')
      .isUUID()  // Changed from .isInt() to .isUUID()
      .withMessage('Invalid store ID')
  ],
  
  // For update routes
  update: [
    param('id')
      .isUUID()  // Changed from .isInt() to .isUUID()
      .withMessage('Invalid store ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Name must be between 2 and 255 characters')
    // ... other validations
  ],
  
  // For create routes (no ID validation needed)
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 255 }),
    body('merchant_id')
      .notEmpty()
      .withMessage('merchant_id is required')
    // ... other validations
  ],
  
  // For search routes
  search: [
    // Optional query validations
  ]
};

module.exports = {
  storeValidationRules,
  validate
};