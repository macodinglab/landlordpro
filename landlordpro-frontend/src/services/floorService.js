import apiClient from './apiClient';

// ✅ Base URL using apiClient
const BASE_PATH = '/floors';

// ------------------- CRUD OPERATIONS -------------------

/**
 * Get all floors (with optional property filter via query params)
 * @param {Object} params - Query parameters { propertyId?: string }
 * @returns {Promise<Object>} { success, total, data: [...floors], filtered_by_property, property_id }
 */
export const getAllFloors = async (params = {}) => {
  try {
    const response = await apiClient.get(BASE_PATH, { params });
    return response.data;
  } catch (err) {
    throw new Error(err?.message || 'Failed to fetch floors');
  }
};

/**
 * Get floors by property ID (full details with occupancy)
 * ✅ FIXED: Now uses correct endpoint and apiClient
 * @param {string} propertyId - Property ID
 * @returns {Promise<Object>} { success, total, property, data: [...floors] }
 */
export const getFloorsByPropertyId = async (propertyId) => {
  try {
    const response = await apiClient.get(`${BASE_PATH}/property/${propertyId}`);
    return response.data;
  } catch (err) {
    throw new Error(err?.message || `Failed to fetch floors for property ${propertyId}`);
  }
};

/**
 * Get simple floor list for a property (minimal data)
 * @param {string} propertyId - Property ID
 * @returns {Promise<Object>} { success, total, property_id, data: [...floors] }
 */
export const getPropertyFloorsSimple = async (propertyId) => {
  try {
    const response = await apiClient.get(`${BASE_PATH}/property/${propertyId}/simple`);
    return response.data;
  } catch (err) {
    throw new Error(err?.message || `Failed to fetch simple floors list for property ${propertyId}`);
  }
};

/**
 * Get single floor by ID
 * @param {string} id - Floor ID
 * @returns {Promise<Object>} { success, data: {...floor} }
 */
export const getFloorById = async (id) => {
  try {
    const response = await apiClient.get(`${BASE_PATH}/${id}`);
    return response.data;
  } catch (err) {
    throw new Error(err?.message || `Failed to fetch floor with ID ${id}`);
  }
};

/**
 * Create a new floor (typically disabled - floors auto-created with properties)
 * @param {Object} data - Floor data
 * @returns {Promise<Object>} { success, message, data: {...floor} }
 */
export const createFloor = async (data) => {
  try {
    const response = await apiClient.post(BASE_PATH, data);
    return response.data;
  } catch (err) {
    throw new Error(err?.message || 'Failed to create floor');
  }
};

/**
 * Update a floor (admin only)
 * @param {string} id - Floor ID
 * @param {Object} data - Updated floor data
 * @returns {Promise<Object>} { success, message, data: {...floor} }
 */
export const updateFloor = async (id, data) => {
  try {
    const response = await apiClient.put(`${BASE_PATH}/${id}`, data);
    return response.data;
  } catch (err) {
    throw new Error(err?.message || `Failed to update floor with ID ${id}`);
  }
};

/**
 * Soft delete a floor (admin only)
 * @param {string} id - Floor ID
 * @returns {Promise<Object>} { success, message }
 */
export const deleteFloor = async (id) => {
  try {
    const response = await apiClient.delete(`${BASE_PATH}/${id}`);
    return response.data;
  } catch (err) {
    throw new Error(err?.message || `Failed to delete floor with ID ${id}`);
  }
};

// ------------------- ANALYTICS & REPORTS -------------------

/**
 * Get floors with detailed statistics (with optional property filter)
 * @param {Object} params - Query parameters { propertyId?: string }
 * @returns {Promise<Object>} { success, total, data: [...floors with statistics] }
 */
export const getFloorsWithStats = async (params = {}) => {
  try {
    const response = await apiClient.get(`${BASE_PATH}/stats`, { params });
    return response.data;
  } catch (err) {
    throw new Error(err?.message || 'Failed to fetch floors with statistics');
  }
};

/**
 * Get summary statistics for dashboard
 * ✅ NEW: Added missing summary endpoint
 * @param {Object} params - Query parameters { propertyId?: string }
 * @returns {Promise<Object>} { success, data: {total_floors, total_locals, ...} }
 */
export const getFloorsSummary = async (params = {}) => {
  try {
    const response = await apiClient.get(`${BASE_PATH}/summary`, { params });
    return response.data;
  } catch (err) {
    throw new Error(err?.message || 'Failed to fetch floors summary');
  }
};

/**
 * Get occupancy report for all floors (with optional property filter)
 * @param {Object} params - Query parameters { propertyId?: string }
 * @returns {Promise<Object>} { success, total, data: [...occupancy reports] }
 */
export const getAllFloorsOccupancy = async (params = {}) => {
  try {
    const response = await apiClient.get(`${BASE_PATH}/reports/occupancy`, { params });
    return response.data;
  } catch (err) {
    throw new Error(err?.message || 'Failed to fetch floors occupancy report');
  }
};

/**
 * Get occupancy report for single floor
 * @param {string} id - Floor ID
 * @returns {Promise<Object>} { success, data: {...occupancy report} }
 */
export const getFloorOccupancy = async (id) => {
  try {
    const response = await apiClient.get(`${BASE_PATH}/${id}/occupancy`);
    return response.data;
  } catch (err) {
    throw new Error(err?.message || `Failed to fetch occupancy report for floor ${id}`);
  }
};

// ------------------- UTILITY FUNCTIONS -------------------

/**
 * Helper to extract floors array from various response structures
 * @param {Object} response - API response
 * @returns {Array} Array of floors
 */
export const extractFloorsData = (response) => {
  if (!response) return [];

  // Handle different response structures
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.floors)) return response.floors;

  // Fallback to empty array
  return [];
};

/**
 * Check if response is filtered by property
 * @param {Object} response - API response
 * @returns {boolean}
 */
export const isFilteredByProperty = (response) => {
  return response?.filtered_by_property || false;
};

/**
 * Get property info from floors response
 * @param {Object} response - API response
 * @returns {Object|null} Property object or null
 */
export const getPropertyInfo = (response) => {
  return response?.property || null;
};

/**
 * Calculate total locals across all floors
 * @param {Array} floors - Array of floors
 * @returns {number} Total number of locals
 */
export const getTotalLocals = (floors) => {
  if (!Array.isArray(floors)) return 0;
  return floors.reduce((sum, floor) => sum + (floor.locals_count || 0), 0);
};

/**
 * Calculate average occupancy rate across floors
 * @param {Array} floors - Array of floors with occupancy data
 * @returns {number} Average occupancy rate (0-100)
 */
export const getAverageOccupancy = (floors) => {
  if (!Array.isArray(floors) || floors.length === 0) return 0;

  const totalOccupancy = floors.reduce((sum, floor) => {
    return sum + (floor.occupancy?.occupancy_rate || floor.occupancy_rate || 0);
  }, 0);

  return parseFloat((totalOccupancy / floors.length).toFixed(2));
};

// ------------------- EXPORTS -------------------

export default {
  // CRUD
  getAllFloors,
  getFloorsByPropertyId,
  getPropertyFloorsSimple,
  getFloorById,
  createFloor,
  updateFloor,
  deleteFloor,

  // Analytics & Reports
  getFloorsWithStats,
  getFloorsSummary,
  getAllFloorsOccupancy,
  getFloorOccupancy,

  // Utilities
  extractFloorsData,
  isFilteredByProperty,
  getPropertyInfo,
  getTotalLocals,
  getAverageOccupancy,
};