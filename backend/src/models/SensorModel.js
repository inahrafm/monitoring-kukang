const db = require("../config/database");

class SensorModel {
  static async getThresholds() {
    return [
      { sensor_type: "temperature", min_value: 20, max_value: 30 },
      { sensor_type: "humidity", min_value: 40, max_value: 80 },
      { sensor_type: "light", min_value: 100, max_value: 1000 },
      { sensor_type: "noise", min_value: 0, max_value: 70 },
    ];
  }

  static async saveReading(data) {
    const query = `INSERT INTO sensor_readings (kandang_id, sensor_id, sensor_type, value, unit, timestamp, created_at)
                   VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING *`;
    const values = [
      data.kandang_id,
      data.sensor_id,
      data.sensor_type,
      data.value,
      data.unit,
      data.timestamp,
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async getKandangSummary() {
    const query = `SELECT kandang_id, COUNT(DISTINCT sensor_type) as active_sensors, MAX(timestamp) as last_reading FROM sensor_readings GROUP BY kandang_id`;
    const result = await db.query(query);
    return result.rows || [];
  }

  static async getReadingsByKandang(kandangId, sensorType = null, limit = 100) {
    try {
      let query = `SELECT * FROM sensor_readings WHERE kandang_id = $1`;
      const values = [kandangId];
      if (sensorType) {
        query += ` AND sensor_type = $2`;
        values.push(sensorType);
      }
      query += ` ORDER BY timestamp DESC LIMIT ${parseInt(limit) || 100}`;
      const result = await db.query(query, values);
      return result.rows || [];
    } catch (e) {
      return [];
    }
  }

  static async getLatestReadings() {
    const query = `SELECT DISTINCT ON (sensor_type, kandang_id) * FROM sensor_readings ORDER BY sensor_type, kandang_id, timestamp DESC`;
    const { rows } = await db.query(query);
    return Array.isArray(rows) ? rows : [];
  }

  static async getReadingsByTimeRange(
    kandangId,
    sensorType,
    startTime,
    endTime,
    rangeType = "24h",
  ) {
    let query;
    const values = [kandangId, sensorType, startTime, endTime];

    // AGREGASI: Jika 7 hari atau 30 hari, kelompokkan data per TANGGAL (1 hari = 1 data)
    if (rangeType === "7d" || rangeType === "30d") {
      query = `
        SELECT 
          date_trunc('day', timestamp) as timestamp, 
          AVG(value) as value, 
          'avg' as unit
        FROM sensor_readings 
        WHERE kandang_id = $1 AND sensor_type = $2 AND timestamp BETWEEN $3 AND $4
        GROUP BY date_trunc('day', timestamp) 
        ORDER BY timestamp ASC`;
    } else {
      // DATA MENTAH: Untuk grafik 24 jam (Hari Ini)
      query = `
        SELECT * FROM sensor_readings 
        WHERE kandang_id = $1 AND sensor_type = $2 AND timestamp BETWEEN $3 AND $4
        ORDER BY timestamp ASC LIMIT 2000`;
    }

    const result = await db.query(query, values);
    return result.rows || [];
  }

  static async getKandangStatistics(kandangId, period = "24h") {
    const interval =
      period === "7d" ? "7 days" : period === "30d" ? "30 days" : "24 hours";
    const query = `SELECT sensor_type, AVG(value) as avg_value, MIN(value) as min_value, MAX(value) as max_value, MODE() WITHIN GROUP (ORDER BY unit) as unit
                   FROM sensor_readings WHERE kandang_id = $1 AND timestamp >= NOW() - $2::interval GROUP BY sensor_type`;
    const result = await db.query(query, [kandangId, interval]);
    return result.rows || [];
  }
}
module.exports = SensorModel;
