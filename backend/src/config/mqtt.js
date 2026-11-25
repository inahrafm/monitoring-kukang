const mqtt = require("mqtt");
require("dotenv").config();

const DEFAULT_BROKER = "mqtt://103.197.189.18:1883";
const KUKANG_TOPIC = "+/kukang/#";

class MQTTConfig {
  constructor() {
    this.client = null;
    this.connected = false;
    this.lastConnectedAt = null;
    this.lastDisconnectedAt = null;
    this.lastMessageAt = null;
    this.lastError = null;
    this.messageHandlers = [];
  }

  getBrokerUrl() {
    return process.env.MQTT_BROKER || DEFAULT_BROKER;
  }

  connect() {
    if (this.client) return this.client;

    const brokerUrl = this.getBrokerUrl();
    if (!process.env.MQTT_USERNAME || !process.env.MQTT_PASSWORD) {
      console.warn(
        "⚠️  MQTT_USERNAME / MQTT_PASSWORD belum diisi di .env — broker kemungkinan menolak koneksi",
      );
    }

    // clientId tetap + clean:false + QoS 1 => broker menyimpan pesan
    // selama backend terputus dan mengirimkannya lagi saat tersambung.
    const options = {
      clientId: process.env.MQTT_CLIENT_ID || "kukang_backend",
      clean: false,
      connectTimeout: 10000,
      reconnectPeriod: 5000,
      keepalive: 60,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
    };

    console.log(`🔌 MQTT: menghubungkan ke ${brokerUrl} ...`);
    this.client = mqtt.connect(brokerUrl, options);

    this.client.on("connect", (connack) => {
      this.connected = true;
      this.lastConnectedAt = new Date();
      this.lastError = null;
      console.log(`✅ MQTT Broker connected (${brokerUrl})`);

      // Jika sesi lama masih tersimpan di broker, subscription sudah aktif.
      if (connack && connack.sessionPresent) {
        console.log(`📡 Sesi MQTT dipulihkan, subscription ${KUKANG_TOPIC} aktif`);
        return;
      }
      this.client.subscribe(KUKANG_TOPIC, { qos: 1 }, (err, granted) => {
        if (err) {
          console.error(`❌ GAGAL SUBSCRIBE ${KUKANG_TOPIC}:`, err.message);
          return;
        }
        const rejected = (granted || []).filter((g) => g.qos === 128);
        if (rejected.length) {
          console.error(
            `❌ Broker menolak subscribe ${KUKANG_TOPIC} (cek ACL user ${process.env.MQTT_USERNAME})`,
          );
        } else {
          console.log(`📡 BERHASIL SUBSCRIBE KE TOPIK: ${KUKANG_TOPIC}`);
        }
      });
    });

    this.client.on("reconnect", () => {
      console.log("🔄 MQTT: mencoba menyambung ulang...");
    });

    this.client.on("close", () => {
      if (this.connected) {
        this.lastDisconnectedAt = new Date();
        console.warn("⚠️  MQTT: koneksi ke broker terputus");
      }
      this.connected = false;
    });

    this.client.on("offline", () => {
      this.connected = false;
    });

    this.client.on("error", (err) => {
      this.lastError = err.message;
      console.error("❌ MQTT Error:", err.message);
    });

    this.client.on("message", (topic, message) => {
      this.lastMessageAt = new Date();
      const payload = message.toString();
      console.log(`📩 RAW MQTT -> Topik: ${topic} | Payload: ${payload}`);
      this.handleMessage(topic, payload);
    });

    return this.client;
  }

  handleMessage(topic, payload) {
    let data;
    try {
      data = JSON.parse(payload);
    } catch (e) {
      data = { value: payload };
    }
    // Payload angka polos (mis. "25.3") ter-parse jadi number
    if (data === null || typeof data !== "object") {
      data = { value: data };
    }
    this.messageHandlers.forEach((handler) => {
      Promise.resolve()
        .then(() => handler(topic, data))
        .catch((err) =>
          console.error(`❌ MQTT handler error (${topic}):`, err.message),
        );
    });
  }

  onMessage(handler) {
    if (typeof handler === "function") {
      this.messageHandlers.push(handler);
    }
  }

  disconnect() {
    return new Promise((resolve) => {
      if (!this.client) return resolve();
      this.client.end(false, {}, () => {
        this.connected = false;
        this.client = null;
        console.log("🔌 MQTT: koneksi ditutup");
        resolve();
      });
    });
  }

  getStatus() {
    return {
      connected: this.connected,
      broker: this.getBrokerUrl(),
      topic: KUKANG_TOPIC,
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectedAt: this.lastDisconnectedAt,
      lastMessageAt: this.lastMessageAt,
      lastError: this.lastError,
    };
  }
}

module.exports = new MQTTConfig();
