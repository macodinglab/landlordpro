const express = require('express');
const router = express.Router();
const localController = require('../controllers/localController');
const { authenticate, adminOnly, managerOrAdminOnly } = require('../middleware/authMiddleware');
const verifyManagerAccess = require('../middleware/verifyManagerAccess');

// ======================================
// 🔐 All routes require authentication
// ======================================
router.use(authenticate);

// ================================
// 📋 Locals CRUD & status management
// ================================

// Get all locals (any authenticated user)
router.get('/locals', localController.getAllLocals);

// Get a single local by ID (any authenticated user)
router.get(
  '/locals/:id',
  verifyManagerAccess({ model: require('../models').Local }),
  localController.getLocalById
);

// Create a new local (admin only)
router.post('/locals', adminOnly, localController.createLocal);

// Update a local (PUT / PATCH = admin only)
router.put('/locals/:id', adminOnly, localController.updateLocal);
router.patch('/locals/:id', adminOnly, localController.updateLocal);

// Soft delete a local (admin only)
router.delete('/locals/:id', adminOnly, localController.deleteLocal);

// Restore a soft-deleted local (admin only)
router.patch('/locals/:id/restore', adminOnly, localController.restoreLocal);

// Update local status (available to authenticated users, could add manager restriction)
router.patch(
  '/locals/:id/status',
  verifyManagerAccess({ model: require('../models').Local }), // optional: restrict manager to assigned property
  localController.updateLocalStatus
);

// Get locals by property ID (any authenticated user)
router.get('/properties/:id/locals', localController.getLocalsByPropertyId);

// Get locals by floor ID (any authenticated user)
router.get('/locals/floor/:floorId', localController.getLocalsByFloorId);

module.exports = router;
