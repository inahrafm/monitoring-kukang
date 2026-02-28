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

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📥 SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('✅ HTTP server closed');
        // Close MQTT connection
        const MQTTConfig = require('./src/config/mqtt');
        MQTTConfig.disconnect();
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📥 SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
    });
});

module.exports = server;