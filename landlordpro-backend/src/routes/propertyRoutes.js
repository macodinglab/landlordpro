// routes/propertyRoutes.js
const express = require('express');
const router = express.Router();

// =======================
// 📦 Controllers
// =======================
const propertyController = require('../controllers/propertyController');
const localController = require('../controllers/localController');

// =======================
// 🧱 Middleware
// =======================
const { authenticate, adminOnly, managerOrAdminOnly } = require('../middleware/authMiddleware');

// ======================================================
// 🔐 All routes require authentication
// ======================================================
router.use(authenticate);

// ======================================================
// 🏠 PROPERTY ROUTES
// ======================================================
// ⚠️ IMPORTANT: This router is mounted at /api in app.js
// Example: app.use('/api', propertyRoutes);
// Therefore, all routes MUST include '/properties' prefix
// Final URLs will be: /api/properties/...

// ------------------------------------------------------
// 🔸 Create a new property
//     → Admin can assign to any manager
//     → Manager creates property assigned to themselves
// ------------------------------------------------------
router.post('/properties', managerOrAdminOnly, propertyController.createProperty);

// ------------------------------------------------------
// 🔸 Get all properties (with pagination)
//     → Admin sees all properties
//     → Manager sees only their assigned properties
// ------------------------------------------------------
router.get('/properties', managerOrAdminOnly, propertyController.getAllProperties);

// ------------------------------------------------------
// 🔸 Get a single property by ID
//     → Admin can access any property
//     → Manager can only access their assigned property
//     → Access control handled by service layer
// ------------------------------------------------------
router.get('/properties/:id', managerOrAdminOnly, propertyController.getPropertyById);

// ------------------------------------------------------
// 🔸 Update a property
//     → Admin can update any property (including manager_id)
//     → Manager can update their assigned property (cannot change manager_id)
//     → Access control handled by service layer
// ------------------------------------------------------
router.put('/properties/:id', managerOrAdminOnly, propertyController.updateProperty);

// ------------------------------------------------------
// 🔸 Soft-delete a property
//     → Admin can delete any property
//     → Manager can delete their assigned property
//     → Access control handled by service layer
// ------------------------------------------------------
router.delete('/properties/:id', adminOnly, propertyController.deleteProperty);

// ------------------------------------------------------
// 🔸 Get all floors for a property
//     → Admin can access floors for any property
//     → Manager can only access floors for their assigned property
//     → Access control handled by service layer
// ✅ FIXED: Changed from adminOnly to managerOrAdminOnly
// ------------------------------------------------------
router.get('/properties/:id/floors', managerOrAdminOnly, propertyController.getFloorsByPropertyId);

// ------------------------------------------------------
// 🔸 Get all locals for a property
//     → Admin can access locals for any property
//     → Manager can only access locals for their assigned property
//     → Access control handled by service layer
// ------------------------------------------------------
router.get('/properties/:id/locals', managerOrAdminOnly, localController.getLocalsByPropertyId);

// ------------------------------------------------------
// 🔸 Assign Manager to Property
//     → Admin only - can assign/reassign managers to properties
//     → Managers cannot reassign properties
// ------------------------------------------------------
router.patch('/properties/:propertyId/assign-manager', adminOnly, propertyController.assignManager);

module.exports = router;