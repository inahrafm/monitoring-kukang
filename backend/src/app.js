const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes/api");
const MQTTConfig = require("./config/mqtt");
const MQTTService = require("./services/mqttService");
const AlertService = require("./services/alertService");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://38.47.176.109"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `${new Date().toISOString()} - ${req.method} ${req.path} [${res.statusCode}] - ${duration}ms`,
    );
  });
  next();
});

app.use("/api", apiRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Kandang Kukang Monitoring System",
    mqtt: MQTTConfig.getStatus(),
  });
});

app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res.status(500).json({
    success: false,
    error: "Something went wrong!",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

const initializeServices = () => {
  try {
    MQTTConfig.connect();
    MQTTService.initialize();

    setInterval(async () => {
      try {
        await AlertService.checkAlerts();
      } catch (err) {
        console.error("Alert Check Error:", err.message);
      }
    }, process.env.ALERT_CHECK_INTERVAL || 60000);

    // SIMULASI DIMATIKAN SESUAI REQUEST
    /*
        if (process.env.NODE_ENV === 'development') {
            console.log('🎮 Starting sensor simulation...');
            setInterval(() => {
                MQTTService.simulateSensorData();
            }, 5000);
        }
        */

    console.log("✅ All services initialized successfully (Simulation: OFF)");
  } catch (error) {
    console.error("❌ Failed to initialize services:", error);
  }
};

module.exports = { app, initializeServices };
