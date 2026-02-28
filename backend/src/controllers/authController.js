const UserModel = require("../models/UserModel");
const AuthMiddleware = require("../middleware/auth");
const { validationResult } = require("express-validator");

class AuthController {
  static async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { username, email, password, full_name } = req.body;

      const existingUser = await UserModel.findByUsername(username);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username already exists",
        });
      }

      const existingEmail = await UserModel.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already registered",
        });
      }

      const newUser = await UserModel.create({
        username,
        email,
        password,
        full_name,
      });

      const token = AuthMiddleware.generateToken(newUser);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      await UserModel.createSession(
        newUser.id,
        token,
        req.headers["user-agent"],
        req.ip,
        expiresAt,
      );

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user: newUser,
          token,
        },
      });
    } catch (error) {
      console.error("Register error details:", error);
      res.status(500).json({
        success: false,
        message: "Error registering user: " + error.message,
      });
    }
  }

  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { username, password } = req.body;

      const user = await UserModel.findByUsername(username);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password",
        });
      }

      const isValidPassword = await UserModel.verifyPassword(
        password,
        user.password_hash,
      );
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password",
        });
      }

      await UserModel.updateLastLogin(user.id);
      const token = AuthMiddleware.generateToken(user);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      await UserModel.createSession(
        user.id,
        token,
        req.headers["user-agent"],
        req.ip,
        expiresAt,
      );

      delete user.password_hash;

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      console.error("Login error details:", error);
      res.status(500).json({
        success: false,
        message: "Error during login",
      });
    }
  }

  static async logout(req, res) {
    try {
      const token = req.token;
      await UserModel.deleteSession(token);
      res.json({ success: true, message: "Logout successful" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error during logout" });
    }
  }

  static async getProfile(req, res) {
    try {
      res.json({ success: true, data: req.user });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error fetching profile" });
    }
  }

  static async updateProfile(req, res) {
    try {
      const { full_name, email } = req.body;
      const updatedUser = await UserModel.updateProfile(req.user.id, {
        full_name,
        email,
      });
      res.json({
        success: true,
        message: "Profile updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error updating profile" });
    }
  }

  static async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;
      const user = await UserModel.findByUsername(req.user.username);
      const isValidPassword = await UserModel.verifyPassword(
        current_password,
        user.password_hash,
      );

      if (!isValidPassword) {
        return res
          .status(400)
          .json({ success: false, message: "Current password is incorrect" });
      }

      await UserModel.changePassword(req.user.id, new_password);
      await UserModel.deleteAllUserSessions(req.user.id);
      res.json({
        success: true,
        message: "Password changed successfully. Please login again.",
      });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Error changing password" });
    }
  }
}

module.exports = AuthController;
