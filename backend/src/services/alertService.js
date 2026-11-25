const SensorModel = require("../models/SensorModel");
const db = require("../config/database");

class AlertService {
  static async checkAlerts() {
    try {
      const latestReadings = await SensorModel.getLatestReadings();
      const thresholds = await SensorModel.getThresholds();
      if (!Array.isArray(latestReadings)) return;
      for (const reading of latestReadings) {
        const threshold = thresholds.find(
          (t) => t.sensor_type === reading.sensor_type,
        );
        if (threshold) {
          if (threshold.min_value != null && reading.value < threshold.min_value)
            await this.createAlert(reading, "min", threshold.min_value);
          if (threshold.max_value != null && reading.value > threshold.max_value)
            await this.createAlert(reading, "max", threshold.max_value);
        }
      }
    } catch (error) {
      console.error("Alert Error:", error.message);
    }
  }

  static async createAlert(reading, type, thresholdValue) {
    // Jangan catat alert yang sama berulang kali: lewati bila alert dengan
    // kandang, sensor dan jenis yang sama sudah tercatat dalam masa cooldown.
    const cooldownMinutes = parseInt(process.env.ALERT_COOLDOWN_MINUTES, 10) || 30;
    const existing = await db.query(
      `SELECT 1 FROM alerts
       WHERE kandang_id = $1 AND sensor_type = $2 AND alert_type = $3
         AND is_resolved = false
         AND created_at > NOW() - ($4 || ' minutes')::interval
       LIMIT 1`,
      [reading.kandang_id, reading.sensor_type, type, String(cooldownMinutes)],
    );
    if (existing.rows.length > 0) return;

    const query = `INSERT INTO alerts (sensor_id, sensor_type, alert_type, value, threshold_value, message, kandang_id)
                       VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    const message = `${reading.sensor_type} (${reading.value}) ${type === "min" ? "rendah" : "tinggi"} (Batas: ${thresholdValue})`;
    await db.query(query, [
      reading.sensor_id,
      reading.sensor_type,
      type,
      reading.value,
      thresholdValue,
      message,
      reading.kandang_id,
    ]);
  }

  static async getActiveAlerts() {
    const result = await db.query(
      `SELECT * FROM alerts WHERE is_resolved = false ORDER BY created_at DESC`,
    );
    return result.rows;
  }
}
module.exports = AlertService;
