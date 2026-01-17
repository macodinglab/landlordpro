// src/services/paymentModeService.js
import apiClient from './apiClient';
import { showSuccess, showError, showInfo } from '../utils/toastHelper';

const BASE_PATH = '/payment-modes';

// Helper for standardized API call
const handleRequest = async (apiCall, successMessage) => {
  try {
    const response = await apiCall();
    if (successMessage) showSuccess(successMessage);
    return response.data;
  } catch (err) {
    showError(err?.message || 'Something went wrong');
    throw err;
  }
};

//  Get all payment modes with pagination & optional search
export const getAllPaymentModes = async (page = 1, limit = 10, search = '') => {
  const params = { page, limit };
  if (search) params.search = search;
  return handleRequest(() => apiClient.get(BASE_PATH, { params }));
};

//  Get a payment mode by ID
export const getPaymentModeById = async (id) => {
  return handleRequest(() => apiClient.get(`${BASE_PATH}/${id}`));
};

//  Create a new payment mode
export const createPaymentMode = async (data) => {
  return handleRequest(() => apiClient.post(BASE_PATH, data), 'Payment mode created successfully!');
};

//  Update payment mode
export const updatePaymentMode = async (id, data) => {
  return handleRequest(() => apiClient.put(`${BASE_PATH}/${id}`, data), 'Payment mode updated successfully!');
};

//  Delete payment mode
export const deletePaymentMode = async (id) => {
  return handleRequest(() => apiClient.delete(`${BASE_PATH}/${id}`), 'Payment mode deleted successfully!');
};

//  Restore payment mode (Admin only)
export const restorePaymentMode = async (id) => {
  return handleRequest(() => apiClient.patch(`${BASE_PATH}/${id}/restore`), 'Payment mode restored successfully!');
};
