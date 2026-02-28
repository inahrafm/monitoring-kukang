const jwt = require("jsonwebtoken");
const UserModel = require("../models/UserModel");

// Jangan buat konstanta di luar jika ingin memastikan .env sudah terload sempurna
class AuthMiddleware {
  // Generate JWT token
  static generateToken(user) {
    const secret = process.env.JWT_SECRET || "kukang_rahasia_banget_2026";
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      secret,
      { expiresIn: "24h" },
    );
  }

  // Verify token middleware
  static async verifyToken(req, res, next) {
    const secret = process.env.JWT_SECRET || "kukang_rahasia_banget_2026";
    try {
      const token = req.header("Authorization")?.replace("Bearer ", "");

      if (!token) {
        console.error("Auth Error: No token provided");
        return res
          .status(401)
          .json({ success: false, message: "No token, authorization denied" });
      }

      // 1. Verify JWT Syntax & Expiration
      const decoded = jwt.verify(token, secret);

      // 2. Check if session exists in database (user_sessions table)
      const session = await UserModel.validateSession(token);
      if (!session) {
        console.error("Auth Error: Session not found in database or expired");
        return res
          .status(401)
          .json({
            success: false,
            message: "Session expired, please login again",
          });
      }

      // 3. Get user data
      const user = await UserModel.findById(decoded.id);
      if (!user) {
        console.error("Auth Error: User no longer exists");
        return res
          .status(401)
          .json({ success: false, message: "User not found" });
      }

      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      console.error("Auth Middleware Error:", error.message);
      res.status(401).json({
        success: false,
        message: "Token is not valid",
      });
    }
  }

  // Check if user is admin
  static isAdmin(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }
    next();
  }
}

module.exports = AuthMiddleware;
