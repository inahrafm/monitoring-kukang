const SensorModel = require("../models/SensorModel");
const AlertService = require("../services/alertService");

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
      const { kandangId, limit } = req.query;
      const alerts = await AlertService.getActiveAlerts({ kandangId, limit });
      res.json({ success: true, data: alerts, total: alerts.length });
    } catch (error) {
      console.error("❌ getActiveAlerts:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async resolveAlert(req, res) {
    try {
      const alertId = Number(req.params.alertId);
      if (!Number.isInteger(alertId) || alertId <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "alertId tidak valid" });
      }
      const alert = await AlertService.resolveAlert(alertId);
      if (!alert) {
        return res
          .status(404)
          .json({ success: false, message: "Alert tidak ditemukan" });
      }
      res.json({ success: true, message: "Alert resolved", data: alert });
    } catch (error) {
      console.error("❌ resolveAlert:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = SensorController;
