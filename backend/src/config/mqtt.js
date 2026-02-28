const mqtt = require("mqtt");
require("dotenv").config();

class MQTTConfig {
  constructor() {
    this.client = null;
    this.connected = false;
    this.messageHandlers = [];
  }

  connect() {
    const brokerUrl = process.env.MQTT_BROKER || "mqtt://38.47.176.109:1883";
    const options = {
      clientId: `kukang_be_${Math.random().toString(16).substr(2, 5)}`,
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 1000,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
    };

    this.client = mqtt.connect(brokerUrl, options);

    this.client.on("connect", () => {
      console.log("✅ MQTT Broker connected");
      this.connected = true;

      // GUNAKAN WILDCARD PALING BASIC DULU
      const testTopic = "#";

      this.client.subscribe(testTopic, (err) => {
        if (!err) {
          console.log(`📡 BERHASIL SUBSCRIBE KE SEMUA TOPIK (#)`);
        } else {
          console.error(`❌ GAGAL SUBSCRIBE:`, err.message);
        }
      });
    });

    this.client.on("message", (topic, message) => {
      const payload = message.toString();
      console.log(`📩 RAW MQTT -> Topik: ${topic} | Payload: ${payload}`);
      this.handleMessage(topic, payload);
    });

    this.client.on("error", (err) => {
      console.error("❌ MQTT Error:", err.message);
      this.connected = false;
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
    this.messageHandlers.forEach((handler) => handler(topic, data));
  }

  onMessage(handler) {
    if (typeof handler === "function") {
      this.messageHandlers.push(handler);
    }
  }

  getStatus() {
    return { connected: this.connected, broker: process.env.MQTT_BROKER };
  }
}

module.exports = new MQTTConfig();
