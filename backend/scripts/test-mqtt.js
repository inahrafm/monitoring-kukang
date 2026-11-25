// Uji koneksi ke broker MQTT memakai konfigurasi .env.
// Pemakaian:
//   npm run test-mqtt                 -> konek, subscribe +/kukang/#, tampilkan pesan 30 detik
//   npm run test-mqtt -- publish      -> juga kirim contoh data ke kandang-test/kukang/temperature
require("dotenv").config();
const mqtt = require("mqtt");

const broker = process.env.MQTT_BROKER || "mqtt://103.197.189.18:1883";
const topic = "+/kukang/#";
const doPublish = process.argv.includes("publish");
const durationMs = 30000;

console.log(`🔌 Menghubungkan ke ${broker} sebagai "${process.env.MQTT_USERNAME || "(tanpa user)"}"...`);
const client = mqtt.connect(broker, {
  clientId: `kukang_test_${Math.random().toString(16).slice(2, 8)}`,
  clean: true,
  connectTimeout: 10000,
  reconnectPeriod: 0,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
});

client.on("connect", () => {
  console.log("✅ Terhubung ke broker");
  client.subscribe(topic, { qos: 1 }, (err, granted) => {
    if (err || (granted || []).some((g) => g.qos === 128)) {
      console.error(`❌ Subscribe ${topic} ditolak:`, err ? err.message : "cek ACL");
      process.exit(1);
    }
    console.log(`📡 Subscribe ${topic} OK — menunggu pesan ${durationMs / 1000} detik...`);
    if (doPublish) {
      const t = "kandang-test/kukang/temperature";
      client.publish(t, JSON.stringify({ value: 25.5 }), { qos: 1 }, () =>
        console.log(`📤 Contoh data dikirim ke ${t}`),
      );
    }
  });
  setTimeout(() => {
    console.log("⏹️  Selesai");
    client.end();
  }, durationMs);
});

client.on("message", (t, m) => console.log(`📩 ${t} -> ${m.toString()}`));
client.on("error", (err) => {
  console.error("❌ Gagal:", err.message);
  process.exit(1);
});
