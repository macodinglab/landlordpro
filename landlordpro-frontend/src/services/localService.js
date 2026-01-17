import apiClient from './apiClient';

const BASE_PATH = '/locals';

// ==================== CRUD OPERATIONS ====================

// Get all locals with advanced filtering
export const getAllLocals = async (params = {}) => {
  try {
    const response = await apiClient.get(BASE_PATH, { params });
    return response.data;
  } catch (err) {
    throw new Error(err?.message || 'Failed to fetch locals');
  }
};

// Get locals by floor ID
export const getLocalsByFloorId = async (floorId, params = {}) => {
  try {
    const response = await apiClient.get(`${BASE_PATH}/floor/${floorId}`, { params });
    return response.data;
  } catch (err) {
    throw new Error(err?.message || `Failed to fetch locals for floor ${floorId}`);
  }
};

// Get a single local by ID
export const getLocalById = async (id) => {
  try {
    const response = await apiClient.get(`${BASE_PATH}/${id}`);
    return response.data;
  } catch (err) {
    throw new Error(err?.message || `Failed to fetch local with ID ${id}`);
  }
};

// Create a new local
export const createLocal = async (data) => {
  try {
    const response = await apiClient.post(BASE_PATH, data);
    return response.data;
  } catch (err) {
    throw new Error(err?.message || 'Failed to create local');
  }
};

// Full update (PUT)
export const updateLocal = async (id, data) => {
  try {
    const response = await apiClient.put(`${BASE_PATH}/${id}`, data);
    return response.data;
  } catch (err) {
    throw new Error(err?.message || `Failed to update local with ID ${id}`);
  }
};

// Partial update (PATCH)
export const patchLocal = async (id, data) => {
  try {
    const response = await apiClient.patch(`${BASE_PATH}/${id}`, data);
    return response.data;
  } catch (err) {
    throw new Error(err?.message || `Failed to patch local with ID ${id}`);
  }
};

// Update only status
export const updateLocalStatus = async (id, status) => {
  try {
    const response = await apiClient.patch(`${BASE_PATH}/${id}/status`, { status });
    return response.data;
  } catch (err) {
    throw new Error(err?.message || `Failed to update status for local ${id}`);
  }
};

// Soft delete
export const deleteLocal = async (id) => {
  try {
    const response = await apiClient.delete(`${BASE_PATH}/${id}`);
    return response.data;
  } catch (err) {
    throw new Error(err?.message || `Failed to delete local with ID ${id}`);
  }
};

// Restore soft-deleted local (Admin only)
export const restoreLocal = async (id) => {
  try {
    const response = await apiClient.patch(`${BASE_PATH}/${id}/restore`);
    return response.data;
  } catch (err) {
    throw new Error(err?.message || `Failed to restore local with ID ${id}`);
  }
};

// ==================== UTILITY FUNCTIONS ====================

// Extract locals data from response
export const extractLocalsData = (response) => {
  return response?.data || [];
};

// Get locals statistics
export const getLocalsStats = async (params = {}) => {
  try {
    const response = await apiClient.get(`${BASE_PATH}/stats`, { params });
    return response.data;
  } catch (err) {
    throw new Error(err?.message || 'Failed to fetch locals statistics');
  }
};

// Search locals
export const searchLocals = async (query, params = {}) => {
  try {
    const response = await apiClient.get(`${BASE_PATH}/search`, {
      params: { q: query, ...params }
    });
    return response.data;
  } catch (err) {
    throw new Error(err?.message || 'Failed to search locals');
  }
};

// Get locals occupancy report
export const getLocalsOccupancy = async (params = {}) => {
  try {
    const response = await apiClient.get(`${BASE_PATH}/reports/occupancy`, { params });
    return response.data;
  } catch (err) {
    throw new Error(err?.message || 'Failed to fetch locals occupancy report');
  }
};

// ==================== BULK OPERATIONS ====================

// Bulk update locals status
export const bulkUpdateLocalStatus = async (localIds, status) => {
  try {
    const response = await apiClient.patch(`${BASE_PATH}/bulk/status`, {
      localIds,
      status
    });
    return response.data;
  } catch (err) {
    throw new Error(err?.message || 'Failed to bulk update locals status');
  }
};

// Bulk delete locals
export const bulkDeleteLocals = async (localIds) => {
  try {
    const response = await apiClient.post(`${BASE_PATH}/bulk/delete`, { localIds });
    return response.data;
  } catch (err) {
    throw new Error(err?.message || 'Failed to bulk delete locals');
  }
};