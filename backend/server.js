const { app, initializeServices } = require('./src/app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`📡 API URL: http://localhost:${PORT}/api`);
    console.log(`💓 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 MQTT Info: http://localhost:${PORT}/api/mqtt/info`);
    
    // Initialize all services
    initializeServices();
});

// Graceful shutdown: tutup HTTP server dan koneksi MQTT
const MQTTConfig = require('./src/config/mqtt');
let shuttingDown = false;
const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`📥 ${signal} signal received: closing HTTP server`);
    // Paksa keluar bila penutupan menggantung
    setTimeout(() => process.exit(1), 10000).unref();
    server.close(async () => {
        console.log('✅ HTTP server closed');
        try {
            await MQTTConfig.disconnect();
        } catch (err) {
            console.error('❌ Gagal menutup MQTT:', err.message);
        }
        process.exit(0);
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = server;
