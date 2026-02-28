const SensorModel = require("../models/SensorModel");
const AlertService = require("./alertService");

class MQTTService {
  constructor() {
    this.sensorTypes = ["temperature", "humidity", "light", "noise"];
    this.unitMap = {
      temperature: "°C",
      humidity: "%",
      light: "Lumen",
      noise: "dB",
    };
    this.activeKandang = new Map();
  }

  initialize() {
    const MQTTConfig = require("../config/mqtt");
    MQTTConfig.onMessage(this.handleSensorData.bind(this));
    console.log("✅ MQTT Service: Listener Aktif");
  }

  async handleSensorData(topic, data) {
    try {
      const topicParts = topic.split("/");
      if (topicParts.length < 3) return;

      const kandangId = topicParts[0];
      const sensorType = topicParts[2];

      if (!this.sensorTypes.includes(sensorType)) return;

      // Update daftar kandang aktif
      this.activeKandang.set(kandangId, new Date());

      const sensorData = {
        kandang_id: kandangId,
        sensor_id: `sensor_${kandangId}_${sensorType}`,
        sensor_type: sensorType,
        value: parseFloat(data.value || data),
        unit: this.unitMap[sensorType] || "unit",
        timestamp: new Date().toISOString(),
      };

      const saved = await SensorModel.saveReading(sensorData);
      if (saved) {
        console.log(
          `✨ DATABASE: [${kandangId}] ${sensorType} = ${sensorData.value}`,
        );
        try {
          await AlertService.checkAlerts();
        } catch (e) {}
      }
    } catch (error) {
      console.error("❌ MQTT Processing Error:", error.message);
    }
  }

  // FUNGSI INI WAJIB ADA BIAR ROUTE GAK CRASH
  getConnectionInfo() {
    return {
      broker: process.env.MQTT_BROKER || "mqtt://38.47.176.109:1883",
      status: "connected",
      format: "kandang-{id}/kukang/{sensor}",
    };
  }

  getActiveKandang() {
    return Array.from(this.activeKandang.keys()).map((id) => ({
      kandang_id: id,
      last_seen: this.activeKandang.get(id),
      status: "active",
    }));
  }
}

module.exports = new MQTTService();
