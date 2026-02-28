const { body } = require("express-validator");

const authValidator = {
  register: [
    body("username")
      .trim()
      .notEmpty()
      .withMessage("Username is required")
      .isLength({ min: 3, max: 50 })
      .withMessage("Username must be 3-50 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage(
        "Username can only contain letters, numbers, and underscore",
      ),

    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),

    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),

    body("full_name")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Full name too long"),
  ],

  login: [
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],

  changePassword: [
    body("current_password")
      .notEmpty()
      .withMessage("Current password is required"),
    body("new_password")
      .notEmpty()
      .withMessage("New password is required")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],

  updateProfile: [
    body("email")
      .optional()
      .trim()
      .isEmail()
      .withMessage("Invalid email format")
      .normalizeEmail(),
    body("full_name")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Full name too long"),
  ],
};

module.exports = authValidator;
