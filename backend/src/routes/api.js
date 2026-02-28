const express = require('express');
const router = express.Router();
const SensorController = require('../controllers/sensorController');
const AuthController = require('../controllers/authController');
const AuthMiddleware = require('../middleware/auth');
const authValidator = require('../validators/authValidator');
const MQTTConfig = require('../config/mqtt');
const MQTTService = require('../services/mqttService');

// ========== PUBLIC ROUTES ==========

// Health check
router.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Kandang Kukang Monitoring System'
    });
});

// MQTT Info (public)
router.get('/mqtt/info', (req, res) => {
    res.json({
        success: true,
        data: {
            ...MQTTConfig.getStatus(),
            connectionInfo: MQTTService.getConnectionInfo(),
            activeKandang: MQTTService.getActiveKandang()
        }
    });
});

// Auth routes
router.post('/auth/register', authValidator.register, AuthController.register);
router.post('/auth/login', authValidator.login, AuthController.login);

// ========== PROTECTED ROUTES ==========

// Auth protected
router.post('/auth/logout', AuthMiddleware.verifyToken, AuthController.logout);
router.get('/auth/profile', AuthMiddleware.verifyToken, AuthController.getProfile);
router.put('/auth/profile', AuthMiddleware.verifyToken, authValidator.updateProfile, AuthController.updateProfile);
router.put('/auth/change-password', AuthMiddleware.verifyToken, authValidator.changePassword, AuthController.changePassword);

// Sensor routes - Global
router.get('/latest', AuthMiddleware.verifyToken, SensorController.getLatestReadings);
router.get('/kandang/summary', AuthMiddleware.verifyToken, SensorController.getKandangSummary);

// Sensor routes - Per Kandang
router.get('/kandang/:kandangId/readings', AuthMiddleware.verifyToken, SensorController.getReadingsByKandang);
router.get('/kandang/:kandangId/statistics', AuthMiddleware.verifyToken, SensorController.getKandangStatistics);
router.get('/kandang/:kandangId/:sensorType/range', AuthMiddleware.verifyToken, SensorController.getReadingsByTimeRange);
router.get('/kandang/:kandangId/:sensorType/historical', AuthMiddleware.verifyToken, SensorController.getReadingsByKandang);

// Alert routes
router.get('/alerts', AuthMiddleware.verifyToken, SensorController.getActiveAlerts);
router.put('/alerts/:alertId/resolve', AuthMiddleware.verifyToken, SensorController.resolveAlert);

module.exports = router;