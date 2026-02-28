const db = require("../config/database");
const bcrypt = require("bcryptjs");

class UserModel {
  static async create(userData) {
    const { username, email, password, full_name, role = "user" } = userData;
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const query = `
            INSERT INTO users (username, email, password_hash, full_name, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, username, email, full_name, role, created_at
        `;
    const values = [username, email, password_hash, full_name, role];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findByUsername(username) {
    const query =
      "SELECT * FROM users WHERE username = $1 AND is_active = true";
    const result = await db.query(query, [username]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = "SELECT * FROM users WHERE email = $1 AND is_active = true";
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
            SELECT id, username, email, full_name, role, last_login, created_at
            FROM users 
            WHERE id = $1 AND is_active = true
        `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updateLastLogin(userId) {
    const query =
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1";
    await db.query(query, [userId]);
  }

  static async updateProfile(userId, updateData) {
    const { full_name, email } = updateData;
    const query = `
            UPDATE users 
            SET full_name = COALESCE($1, full_name),
                email = COALESCE($2, email),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING id, username, email, full_name, role
        `;
    const result = await db.query(query, [full_name, email, userId]);
    return result.rows[0];
  }

  static async changePassword(userId, newPassword) {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);
    const query =
      "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2";
    await db.query(query, [password_hash, userId]);
    return true;
  }

  static async createSession(userId, token, deviceInfo, ipAddress, expiresAt) {
    const query = `
            INSERT INTO user_sessions (user_id, token, device_info, ip_address, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `;
    const result = await db.query(query, [
      userId,
      token,
      deviceInfo,
      ipAddress,
      expiresAt,
    ]);
    return result.rows[0];
  }

  static async validateSession(token) {
    const query = `
            SELECT s.*, u.username, u.role
            FROM user_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = $1 
                AND s.expires_at > CURRENT_TIMESTAMP
                AND u.is_active = true
        `;
    const result = await db.query(query, [token]);
    return result.rows[0];
  }

  static async deleteSession(token) {
    const query = "DELETE FROM user_sessions WHERE token = $1";
    await db.query(query, [token]);
    return true;
  }

  static async deleteAllUserSessions(userId) {
    const query = "DELETE FROM user_sessions WHERE user_id = $1";
    await db.query(query, [userId]);
    return true;
  }
  static async getReadingsByTimeRange(
    kandangId,
    sensorType,
    startTime,
    endTime,
    interval = "raw",
  ) {
    let query;
    let values = [kandangId, sensorType, startTime, endTime];

    if (interval === "day") {
      // Agregasi harian untuk mingguan/bulanan
      query = `
        SELECT 
          date_trunc('day', timestamp) as timestamp,
          AVG(value) as value,
          MODE() WITHIN GROUP (ORDER BY unit) as unit
        FROM sensor_readings 
        WHERE kandang_id = $1 AND sensor_type = $2 AND timestamp BETWEEN $3 AND $4
        GROUP BY date_trunc('day', timestamp)
        ORDER BY timestamp ASC
      `;
    } else if (interval === "month") {
      // Agregasi bulanan untuk tahunan
      query = `
        SELECT 
          date_trunc('month', timestamp) as timestamp,
          AVG(value) as value,
          MODE() WITHIN GROUP (ORDER BY unit) as unit
        FROM sensor_readings 
        WHERE kandang_id = $1 AND sensor_type = $2 AND timestamp BETWEEN $3 AND $4
        GROUP BY date_trunc('month', timestamp)
        ORDER BY timestamp ASC
      `;
    } else {
      // Data raw untuk 24 jam
      query = `
        SELECT * FROM sensor_readings 
        WHERE kandang_id = $1 AND sensor_type = $2 AND timestamp BETWEEN $3 AND $4
        ORDER BY timestamp ASC LIMIT 1000
      `;
    }

    const result = await db.query(query, values);
    return result.rows;
  }
}

module.exports = UserModel;
