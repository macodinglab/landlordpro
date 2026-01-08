const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, adminOnly } = require('../middleware/authMiddleware');

// Protect all report routes - admin only
router.use(authenticate);
router.use(adminOnly);

router.get('/financials', reportController.getFinancialSummary);
router.get('/occupancy', reportController.getOccupancyStats);
router.get('/rent-roll', reportController.getRentRoll);
router.get('/arrears', reportController.getArrearsReport);
router.get('/lease-expirations', reportController.getLeaseExpirations);
router.get('/vacancy', reportController.getVacancyReport);

module.exports = router;
