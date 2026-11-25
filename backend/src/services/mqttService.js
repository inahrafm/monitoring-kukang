const SensorModel = require("../models/SensorModel");
const MQTTConfig = require("../config/mqtt");

// Batas wajar timestamp dari alat (alat tanpa RTC/NTP sering kirim
// millis() sejak boot atau tahun 1970 — itu diabaikan).
const MIN_VALID_TS = Date.UTC(2020, 0, 1);
const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;

class MQTTService {
  constructor() {
    // Harus sama dengan ENUM sensor_type di PostgreSQL (lihat backend/migrations).
    this.sensorTypes = [
      "temperature",
      "humidity",
      "light",
      "noise",
      "voltage",
      "current",
      "power",
    ];
    // Nilai sudah dikalibrasi di firmware; disimpan apa adanya.
    this.unitMap = {
      temperature: "°C",
      humidity: "%",
      light: "Lux",
      noise: "dB",
      voltage: "V",
      current: "mA",
      power: "mW",
    };
    this.activeKandang = new Map();
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;
    MQTTConfig.onMessage(this.handleSensorData.bind(this));
    this.initialized = true;
    console.log("✅ MQTT Service: Listener Aktif");
  }

  // Ambil timestamp dari payload bila valid, selain itu pakai jam server.
  resolveTimestamp(data) {
    const raw = data.timestamp ?? data.ts ?? data.time;
    if (raw !== undefined && raw !== null && raw !== "") {
      let ms;
      if (typeof raw === "number" || /^\d+(\.\d+)?$/.test(String(raw))) {
        const n = Number(raw);
        ms = n < 1e12 ? n * 1000 : n; // detik -> milidetik
      } else {
        ms = Date.parse(raw);
      }
      if (
        Number.isFinite(ms) &&
        ms >= MIN_VALID_TS &&
        ms <= Date.now() + MAX_FUTURE_MS
      ) {
        return new Date(ms).toISOString();
      }
    }
    return new Date().toISOString();
  }

  async handleSensorData(topic, data) {
    try {
      // Format: {kandangId}/kukang/{sensor}, mis. kandang-1/kukang/temperature
      const topicParts = topic.split("/");
      if (topicParts.length !== 3 || topicParts[1] !== "kukang") {
        console.warn(
          `⚠️  MQTT: topik diabaikan (format harus {kandang}/kukang/{sensor}): ${topic}`,
        );
        return;
      }

      const kandangId = topicParts[0];
      const sensorType = topicParts[2];

      if (!this.sensorTypes.includes(sensorType)) {
        console.warn(
          `⚠️  MQTT: sensor tidak dikenal "${sensorType}" di ${topic} (dikenal: ${this.sensorTypes.join(", ")})`,
        );
        return;
      }

      const value = parseFloat(data.value);
      if (!Number.isFinite(value)) {
        console.warn(
          `⚠️  MQTT: nilai bukan angka di ${topic}: ${JSON.stringify(data)}`,
        );
        return;
      }

      this.activeKandang.set(kandangId, new Date());

      const sensorData = {
        kandang_id: kandangId,
        sensor_id: `sensor_${kandangId}_${sensorType}`,
        sensor_type: sensorType,
        value,
        unit: this.unitMap[sensorType] || "unit",
        timestamp: this.resolveTimestamp(data),
      };

      const saved = await SensorModel.saveReading(sensorData);
      if (saved) {
        console.log(
          `✨ DATABASE: [${kandangId}] ${sensorType} = ${sensorData.value}`,
        );
      }
      // Pengecekan alert dilakukan berkala di app.js (ALERT_CHECK_INTERVAL),
      // tidak per pesan, agar alert tidak tercatat berulang-ulang.
    } catch (error) {
      console.error(`❌ MQTT Processing Error (${topic}):`, error.message);
    }
  }

  getConnectionInfo() {
    const status = MQTTConfig.getStatus();
    return {
      broker: status.broker,
      status: status.connected ? "connected" : "disconnected",
      format: "kandang-{id}/kukang/{sensor}",
      sensors: this.sensorTypes,
    };
  }

  getActiveKandang() {
    // Alat kirim tiap ~5 menit; dianggap aktif bila ada data dalam 15 menit terakhir
    const ACTIVE_WINDOW_MS = 15 * 60 * 1000;
    const now = Date.now();
    return Array.from(this.activeKandang.entries()).map(([id, lastSeen]) => ({
      kandang_id: id,
      last_seen: lastSeen,
      status: now - lastSeen.getTime() <= ACTIVE_WINDOW_MS ? "active" : "inactive",
    }));
  }
}

module.exports = new MQTTService();
