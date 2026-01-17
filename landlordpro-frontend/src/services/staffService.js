import apiClient from './apiClient';
import { showError, showSuccess } from '../utils/toastHelper';

const BASE_PATH = '/staff';

export const getAllStaff = async (page = 1, limit = 10, search = '', includeDeleted = false) => {
  try {
    const { data } = await apiClient.get(BASE_PATH, { params: { page, limit, search, includeDeleted } });
    return {
      staff: data.staff || [],
      totalPages: data.totalPages || 1,
      page: data.page || page,
    };
  } catch (err) {
    showError(err.message || 'Failed to fetch staff');
    return { staff: [], totalPages: 1, page };
  }
};

export const createStaff = async (payload) => {
  try {
    const { data } = await apiClient.post(BASE_PATH, payload);
    showSuccess(data.message || 'Staff member created successfully');
    return data.staff;
  } catch (err) {
    showError(err.message || 'Failed to create staff member');
    throw err;
  }
};

export const updateStaff = async (id, payload) => {
  try {
    const { data } = await apiClient.put(`${BASE_PATH}/${id}`, payload);
    showSuccess(data.message || 'Staff member updated successfully');
    return data.staff;
  } catch (err) {
    showError(err.message || 'Failed to update staff member');
    throw err;
  }
};

export const deleteStaff = async (id) => {
  try {
    const { data } = await apiClient.delete(`${BASE_PATH}/${id}`);
    showSuccess(data.message || 'Staff member deleted successfully');
    return data;
  } catch (err) {
    showError(err.message || 'Failed to delete staff member');
    throw err;
  }
};

export const restoreStaff = async (id) => {
  try {
    const { data } = await apiClient.patch(`${BASE_PATH}/${id}/restore`);
    showSuccess(data.message || 'Staff member restored successfully');
    return data.staff;
  } catch (err) {
    showError(err.message || 'Failed to restore staff member');
    throw err;
  }
};
