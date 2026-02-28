const SensorModel = require("../models/SensorModel");

class SensorController {
  static async getLatestReadings(req, res) {
    try {
      const readings = await SensorModel.getLatestReadings();
      const groupedReadings = {};
      if (Array.isArray(readings)) {
        readings.forEach((reading) => {
          if (!groupedReadings[reading.kandang_id])
            groupedReadings[reading.kandang_id] = {};
          groupedReadings[reading.kandang_id][reading.sensor_type] = reading;
        });
      }
      res.json({
        success: true,
        data: groupedReadings,
        totalKandang: Object.keys(groupedReadings).length,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getReadingsByKandang(req, res) {
    try {
      const { kandangId } = req.params;
      const { sensorType, limit = 100 } = req.query;
      const readings = await SensorModel.getReadingsByKandang(
        kandangId,
        sensorType,
        limit,
      );
      res.json({ success: true, data: readings });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // INI FUNGSI YANG DIPAKE CHART LO
  static async getHistoricalData(req, res) {
    try {
      const kandangId = req.params.id || req.params.kandangId;
      const sensorType = req.params.type || req.params.sensorType;
      const { startTime, endTime, rangeType } = req.query;

      const data = await SensorModel.getReadingsByTimeRange(
        kandangId,
        sensorType,
        startTime,
        endTime,
        rangeType || "24h", // Pastikan rangeType terkirim
      );
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Samakan agar tidak ada kebingungan rute
  static async getReadingsByTimeRange(req, res) {
    return SensorController.getHistoricalData(req, res);
  }

  static async getKandangSummary(req, res) {
    try {
      const summary = await SensorModel.getKandangSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getKandangStatistics(req, res) {
    try {
      const { kandangId } = req.params;
      const { period = "24h" } = req.query;
      const statistics = await SensorModel.getKandangStatistics(
        kandangId,
        period,
      );
      res.json({ success: true, data: statistics });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getActiveAlerts(req, res) {
    try {
      res.json({ success: true, data: [] });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async resolveAlert(req, res) {
    try {
      res.json({ success: true, message: "Alert resolved" });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = SensorController;
