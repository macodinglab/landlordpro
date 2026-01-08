import axios from 'axios';
import { showError, showSuccess } from '../utils/toastHelper';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL + '/api/staff';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An error occurred';
    if (error.response?.data?.message) message = error.response.data.message;
    else if (error.message) message = error.message;
    console.error('Staff API error:', error.response || error);
    return Promise.reject({ ...error.response?.data, message });
  }
);

export const getAllStaff = async (page = 1, limit = 10, search = '', includeDeleted = false) => {
  try {
    const { data } = await axiosInstance.get('/', { params: { page, limit, search, includeDeleted } });
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
    const { data } = await axiosInstance.post('/', payload);
    showSuccess(data.message || 'Staff member created successfully');
    return data.staff;
  } catch (err) {
    showError(err.message || 'Failed to create staff member');
    throw err;
  }
};

export const updateStaff = async (id, payload) => {
  try {
    const { data } = await axiosInstance.put(`/${id}`, payload);
    showSuccess(data.message || 'Staff member updated successfully');
    return data.staff;
  } catch (err) {
    showError(err.message || 'Failed to update staff member');
    throw err;
  }
};

export const deleteStaff = async (id) => {
  try {
    const { data } = await axiosInstance.delete(`/${id}`);
    showSuccess(data.message || 'Staff member deleted successfully');
    return data;
  } catch (err) {
    showError(err.message || 'Failed to delete staff member');
    throw err;
  }
};

export const restoreStaff = async (id) => {
  try {
    const { data } = await axiosInstance.patch(`/${id}/restore`);
    showSuccess(data.message || 'Staff member restored successfully');
    return data.staff;
  } catch (err) {
    showError(err.message || 'Failed to restore staff member');
    throw err;
  }
};
