const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, managerOrAdminOnly } = require('../middleware/authMiddleware');

// Protect all manager report routes
router.use(authenticate);
router.use(managerOrAdminOnly);

// Manager-specific report endpoints
router.get('/financials', reportController.getFinancialSummary);
router.get('/occupancy', reportController.getOccupancyStats);
router.get('/rent-roll', reportController.getRentRoll);
router.get('/arrears', reportController.getArrearsReport);
router.get('/lease-expirations', reportController.getLeaseExpirations);
router.get('/vacancy', reportController.getVacancyReport);

module.exports = router;
