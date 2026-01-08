const localService = require('../services/localService');
const Property = require('../models/Property');

/**
 * Get all locals (optional filtering by property or floor)
 */
async function getAllLocals(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const propertyId = req.query.propertyId || null;
    const floorId = req.query.floorId || null;

    const data = await localService.getAllLocals({ page, limit, propertyId, floorId, user: req.user });
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

/**
 * Get locals by property ID
 */
async function getLocalsByPropertyId(req, res) {
  try {
    const { id: propertyId } = req.params;

    if (req.user.role === 'manager') {
      const property = await Property.findByPk(propertyId, { attributes: ['id', 'manager_id'] });
      if (!property) {
        return res.status(404).json({ success: false, message: 'Property not found' });
      }
      if (property.manager_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this property.' });
      }
    }

    const data = await localService.getAllLocals({ page: 1, limit: 1000, propertyId, user: req.user });
    res.status(200).json({ success: true, locals: data.locals });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

/**
 * Get locals by floor ID
 */
async function getLocalsByFloorId(req, res) {
  try {
    const { floorId } = req.params;

    // Check access for managers
    if (req.user.role === 'manager') {
      const Floor = require('../models/Floor');
      const Property = require('../models/Property');

      const floor = await Floor.findByPk(floorId, {
        include: [{ model: Property, as: 'propertyForFloor', attributes: ['id', 'manager_id'] }]
      });

      if (!floor) {
        return res.status(404).json({ success: false, message: 'Floor not found' });
      }

      // Note: the association might be 'property' or 'propertyForFloor' depending on model definition. 
      // Based on floorService.js it seems to be 'propertyForFloor' in Floor model.
      // Let's check Floor model if needed, but floorService uses 'propertyForFloor'.
      // However, LocalService uses 'floor' relation.

      const managerId = floor.propertyForFloor?.manager_id;

      if (managerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this property.' });
      }
    }

    const data = await localService.getAllLocals({ page: 1, limit: 1000, floorId, user: req.user });
    res.status(200).json({ success: true, locals: data.locals });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
}

/**
 * Get a single local by ID
 */
async function getLocalById(req, res) {
  try {
    const { id } = req.params;
    const local = await localService.getLocalById(id);
    res.status(200).json({ success: true, local });
  } catch (err) {
    console.error(err);
    res.status(err.status || 404).json({ success: false, message: err.message });
  }
}

/**
 * Create a new local
 */
async function createLocal(req, res) {
  try {
    const { reference_code, status, size_m2, property_id, level } = req.body;

    if (!property_id) throw new Error('Property ID is required');
    if (level === undefined || level === null) throw new Error('Level is required');

    const local = await localService.createLocal({
      reference_code,
      status,
      size_m2,
      property_id,
      level,
    });

    res.status(201).json({ success: true, message: 'Local created successfully', local });
  } catch (err) {
    console.error(err);
    res.status(err.status || 400).json({ success: false, message: err.message });
  }
}

/**
 * Update a local
 */
async function updateLocal(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;
    const local = await localService.updateLocal(id, data);
    res.status(200).json({ success: true, message: 'Local updated successfully', local });
  } catch (err) {
    console.error(err);
    res.status(err.status || 400).json({ success: false, message: err.message });
  }
}

/**
 * Soft delete a local
 */
async function deleteLocal(req, res) {
  try {
    const { id } = req.params;
    await localService.deleteLocal(id);
    res.status(200).json({ success: true, message: 'Local deleted (soft) successfully' });
  } catch (err) {
    console.error(err);
    res.status(err.status || 400).json({ success: false, message: err.message });
  }
}

/**
 * Restore a soft-deleted local (Admins only)
 */
async function restoreLocal(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;
    await localService.restoreLocal(id, user);
    const local = await localService.getLocalById(id);
    res.status(200).json({ success: true, message: 'Local restored successfully', local });
  } catch (err) {
    console.error(err);
    res.status(err.status || 400).json({ success: false, message: err.message });
  }
}

/**
 * Update local status
 */
async function updateLocalStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const local = await localService.updateLocalStatus(id, status);
    res.status(200).json({ success: true, message: 'Local status updated successfully', local });
  } catch (err) {
    console.error(err);
    res.status(err.status || 400).json({ success: false, message: err.message });
  }
}

module.exports = {
  getAllLocals,
  getLocalById,
  createLocal, // enabled
  updateLocal,
  deleteLocal,
  restoreLocal,
  updateLocalStatus,
  getLocalsByPropertyId,
  getLocalsByFloorId,
};
