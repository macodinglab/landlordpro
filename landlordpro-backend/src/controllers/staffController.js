const staffService = require('../services/staffService');

// Get all staff (with pagination + optional search)
async function getAllStaff(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const includeDeleted = req.query.includeDeleted === 'true';

    const result = await staffService.getAllStaff({ page, limit, search, includeDeleted });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error('Error fetching staff:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// Get single staff member by ID
async function getStaffById(req, res) {
  try {
    const staff = await staffService.getStaffById(req.params.id);
    res.status(200).json({ success: true, staff });
  } catch (err) {
    console.error('Error fetching staff member:', err);
    res.status(404).json({ success: false, message: err.message });
  }
}

// Create staff member
async function createStaff(req, res) {
  try {
    const staff = await staffService.createStaff(req.body || {});
    res.status(201).json({ success: true, message: 'Staff member created successfully', staff });
  } catch (err) {
    console.error('Error creating staff member:', err);
    res.status(400).json({ success: false, message: err.message });
  }
}

// Update staff member
async function updateStaff(req, res) {
  try {
    const staff = await staffService.updateStaff(req.params.id, req.body || {});
    res.status(200).json({ success: true, message: 'Staff member updated successfully', staff });
  } catch (err) {
    console.error('Error updating staff member:', err);
    res.status(400).json({ success: false, message: err.message });
  }
}

// Soft delete staff member
async function deleteStaff(req, res) {
  try {
    const result = await staffService.deleteStaff(req.params.id);
    res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    console.error('Error deleting staff member:', err);
    res.status(404).json({ success: false, message: err.message });
  }
}

// Restore staff member
async function restoreStaff(req, res) {
  try {
    const staff = await staffService.restoreStaff(req.params.id);
    res.status(200).json({ success: true, message: 'Staff member restored successfully', staff });
  } catch (err) {
    console.error('Error restoring staff member:', err);
    res.status(404).json({ success: false, message: err.message });
  }
}

module.exports = {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  restoreStaff,
};
