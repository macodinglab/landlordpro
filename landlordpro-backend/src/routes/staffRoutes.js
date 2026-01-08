const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { authenticate, adminOnly } = require('../middleware/authMiddleware');

// All staff routes are admin-only
router.use(authenticate);
router.use('/staff', adminOnly);

// GET /staff - list staff with pagination & search
router.get('/staff', staffController.getAllStaff);

// GET /staff/:id - get single staff member
router.get('/staff/:id', staffController.getStaffById);

// POST /staff - create staff member
router.post('/staff', staffController.createStaff);

// PUT /staff/:id - update staff member
router.put('/staff/:id', staffController.updateStaff);
router.patch('/staff/:id', staffController.updateStaff);

// DELETE /staff/:id - soft delete staff member
router.delete('/staff/:id', staffController.deleteStaff);

// PATCH /staff/:id/restore - restore soft deleted staff member
router.patch('/staff/:id/restore', staffController.restoreStaff);

module.exports = router;
