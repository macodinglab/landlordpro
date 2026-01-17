import apiClient from './apiClient';
import { showSuccess, showError } from '../utils/toastHelper';

const BASE_PATH = '/properties';

// ------------------- HELPER: Extract Error Message -------------------
const getErrorMessage = (error) => {
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
};

// ================= API FUNCTIONS ================= //

// Get all properties with pagination
export const getAllProperties = async (page = 1, limit = 10) => {
  try {
    const { data } = await apiClient.get(BASE_PATH, { params: { page, limit } });

    console.log('getAllProperties response:', data);

    // Handle different possible response structures
    if (data.data && Array.isArray(data.data.properties)) {
      // Structure: { data: { properties: [], totalPages, page } }
      return {
        properties: data.data.properties || [],
        totalPages: data.data.totalPages || 1,
        page: data.data.page || page
      };
    } else if (data.data && Array.isArray(data.data)) {
      // Structure: { data: [] } with pagination in root
      return {
        properties: data.data,
        totalPages: data.pagination?.totalPages || data.totalPages || 1,
        page: data.pagination?.page || data.page || page
      };
    } else if (Array.isArray(data.data)) {
      // Structure: { data: [] }
      return {
        properties: data.data,
        totalPages: 1,
        page: page
      };
    } else if (Array.isArray(data)) {
      // Structure: [] (direct array)
      return {
        properties: data,
        totalPages: 1,
        page: page
      };
    } else {
      // Fallback - ensure we always return the expected structure
      console.warn('Unexpected API response structure:', data);
      return {
        properties: [],
        totalPages: 1,
        page: page
      };
    }
  } catch (err) {
    console.error('getAllProperties error:', err);
    const message = getErrorMessage(err);
    showError(message || 'Failed to fetch properties.');
    // Return safe fallback instead of throwing to prevent page crashes
    return {
      properties: [],
      totalPages: 1,
      page: page
    };
  }
};

// Get a property by ID
export const getPropertyById = async (id) => {
  try {
    console.log('getPropertyById called with id:', id);
    const { data } = await apiClient.get(`${BASE_PATH}/${id}`);
    console.log('getPropertyById response:', data);

    // Handle different response structures
    if (data.data) {
      return data.data;
    } else if (data.property) {
      return data.property;
    } else if (data.id) {
      // Direct property object
      return data;
    }

    return null;
  } catch (err) {
    console.error('getPropertyById error:', {
      id,
      error: err,
      status: err.response?.status,
      data: err.response?.data
    });
    const message = getErrorMessage(err);
    showError(message || 'Property not found.');
    throw err;
  }
};

// Create a new property
export const createProperty = async (propertyData, refreshCallback) => {
  try {
    const { data } = await apiClient.post(BASE_PATH, propertyData);
    showSuccess(data.message || 'Property created successfully.');
    if (refreshCallback && typeof refreshCallback === 'function') {
      refreshCallback();
    }
    return data.data || null;
  } catch (err) {
    console.error('createProperty error:', err);
    const message = getErrorMessage(err);
    showError(message || 'Failed to create property.');
    throw err;
  }
};

// Update a property
export const updateProperty = async (id, propertyData, refreshCallback) => {
  try {
    const { data } = await apiClient.put(`${BASE_PATH}/${id}`, propertyData);
    showSuccess(data.message || 'Property updated successfully.');
    if (refreshCallback && typeof refreshCallback === 'function') {
      refreshCallback();
    }
    return data.data || null;
  } catch (err) {
    console.error('updateProperty error:', err);
    const message = getErrorMessage(err);
    showError(message || 'Failed to update property.');
    throw err;
  }
};

// Delete (soft delete) a property
export const deleteProperty = async (id, refreshCallback) => {
  try {
    const { data } = await apiClient.delete(`${BASE_PATH}/${id}`);
    showSuccess(data.message || 'Property deleted successfully.');
    if (refreshCallback && typeof refreshCallback === 'function') {
      refreshCallback();
    }
    return data || null;
  } catch (err) {
    console.error('deleteProperty error:', err);
    const message = getErrorMessage(err);
    showError(message || 'Failed to delete property.');
    throw err;
  }
};

// ================= Floors ================= //

// Get all floors for a property
export const getFloorsByPropertyId = async (propertyId) => {
  try {
    console.log('getFloorsByPropertyId called with propertyId:', propertyId);
    const { data } = await apiClient.get(`${BASE_PATH}/${propertyId}/floors`);
    console.log('getFloorsByPropertyId raw response:', data);

    // Handle different response structures for floors
    // ✅ Match the new backend structure: { floors: [...], property: {...} }
    if (data.data && Array.isArray(data.data.floors)) {
      console.log('Response structure: data.data.floors (length:', data.data.floors.length, ')');
      return data.data; // Return entire object with floors and property
    } else if (Array.isArray(data.data)) {
      console.log('Response structure: data.data array (length:', data.data.length, ')');
      return { floors: data.data, property: null };
    } else if (data.floors && Array.isArray(data.floors)) {
      console.log('Response structure: data.floors (length:', data.floors.length, ')');
      return data; // Already has floors and property
    } else if (Array.isArray(data)) {
      console.log('Response structure: direct array (length:', data.length, ')');
      return { floors: data, property: null };
    } else {
      console.warn('Unexpected floors response structure:', data);
      return { floors: [], property: null };
    }
  } catch (err) {
    console.error('getFloorsByPropertyId error:', {
      propertyId,
      error: err,
      status: err.response?.status,
      data: err.response?.data
    });
    const message = getErrorMessage(err);
    showError(message || 'Failed to fetch floors.');
    return { floors: [], property: null }; // Return consistent structure
  }
};

// ================= Locals ================= //

// Get all locals for a property
export const getLocalsByPropertyId = async (propertyId) => {
  try {
    console.log('getLocalsByPropertyId called with propertyId:', propertyId);
    const { data } = await apiClient.get(`${BASE_PATH}/${propertyId}/locals`);
    console.log('getLocalsByPropertyId response:', data);

    // Handle different response structures for locals
    if (Array.isArray(data.data)) {
      return data.data;
    } else if (Array.isArray(data.data?.locals)) {
      return data.data.locals;
    } else if (Array.isArray(data)) {
      return data;
    } else {
      console.warn('Unexpected locals response structure:', data);
      return [];
    }
  } catch (err) {
    console.error('getLocalsByPropertyId error:', err);
    const message = getErrorMessage(err);
    showError(message || 'Failed to fetch locals.');
    return []; // Return empty array instead of throwing
  }
};

// Utility function to debug API responses
export const debugApiResponse = (response, endpoint) => {
  console.log(`API Response from ${endpoint}:`, response);
  return response;
};

// ================= Assign Manager to Property ================= //
export const assignManagerToProperty = async (propertyId, managerId, refreshCallback) => {
  if (!propertyId || !managerId) {
    showError('Property ID and Manager ID are required.');
    return null;
  }

  try {
    const { data } = await apiClient.patch(`${BASE_PATH}/${propertyId}/assign-manager`, { manager_id: managerId });
    showSuccess(data.message || 'Manager assigned to property successfully.');

    if (refreshCallback && typeof refreshCallback === 'function') {
      refreshCallback();
    }

    return data.data || null;
  } catch (err) {
    console.error('assignManagerToProperty error:', err);
    const message = getErrorMessage(err);
    showError(message || 'Failed to assign manager.');
    throw err;
  }
};