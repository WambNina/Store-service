const { body, param, query, validationResult } = require("express-validator");

const storeValidationRules = {
  create: [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Store name is required")
      .isLength({ min: 2, max: 255 })
      .withMessage("Name must be between 2 and 255 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Description cannot exceed 1000 characters"),
    body("email")
      .optional()
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
    body("phone")
      .optional()
      .matches(/^[\d\s\-\+\(\)]+$/)
      .withMessage("Invalid phone number format"),
    body("status").optional(),
    body("users")
      .optional()
      .isArray({ max: 3 })
      .withMessage("A store can have maximum 3 users"),

    body("users.*")
      .optional()
      .isInt({ min: 1 })
      .withMessage("User IDs must be valid integers"),
  ],
  update: [
    param("id").isInt({ min: 1 }).withMessage("Invalid store ID"),
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage("Name must be between 2 and 255 characters"),
    body("email").optional().isEmail().withMessage("Invalid email format"),
  ],
  getById: [param("id").isInt({ min: 1 }).withMessage("Invalid store ID")],
  search: [
    query("q").optional().trim().escape(),
    query("city").optional().trim().escape(),
    query("status").optional().isIn(["active", "inactive", "pending"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

module.exports = {
  storeValidationRules,
  validate,
};
