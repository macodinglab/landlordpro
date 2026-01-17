import apiClient from './apiClient';

const BASE_PATH = '/payments';

// Helper to construct safe URLs for images/proofs
const getSafeBaseUrl = () => {
  const rawUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  return rawUrl.trim().replace(/\/+$/, '');
};

// Get all payments (optional search term)
export const getAllPayments = async (term = '') => {
  const params = term ? { term } : {};
  const response = await apiClient.get(BASE_PATH, { params });
  return response.data?.data || [];
};

// Get payment by ID
export const getPaymentById = async (id) => {
  const response = await apiClient.get(`${BASE_PATH}/${id}`);
  return response.data?.data || null;
};

// Create a new payment (supports proof and date range)
export const createPayment = async (data) => {
  const formData = new FormData();
  formData.append('amount', data.amount);
  formData.append('leaseId', data.leaseId);
  formData.append('paymentModeId', data.paymentModeId);
  formData.append('startDate', data.startDate);
  formData.append('endDate', data.endDate);
  if (data.propertyId) formData.append('propertyId', data.propertyId);
  if (data.proof) formData.append('proof', data.proof);

  const response = await apiClient.post(BASE_PATH, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data?.data || null;
};

// Update payment (supports proof and date range)
export const updatePayment = async (id, data) => {
  const formData = new FormData();
  if (data.amount) formData.append('amount', data.amount);
  if (data.leaseId) formData.append('leaseId', data.leaseId);
  if (data.paymentModeId) formData.append('paymentModeId', data.paymentModeId);
  if (data.startDate) formData.append('startDate', data.startDate);
  if (data.endDate) formData.append('endDate', data.endDate);
  if (data.propertyId) formData.append('propertyId', data.propertyId);
  if (data.proof) formData.append('proof', data.proof);

  const response = await apiClient.put(`${BASE_PATH}/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data?.data || null;
};

// Soft delete payment
export const softDeletePayment = async (id) => {
  const response = await apiClient.delete(`${BASE_PATH}/${id}`);
  return response.data?.message || 'Deleted successfully';
};

// Restore soft-deleted payment
export const restorePayment = async (id) => {
  const response = await apiClient.patch(`${BASE_PATH}/${id}/restore`);
  return response.data?.data || null;
};

// Get payment proof URL
export const getPaymentProofUrl = (paymentId, filename) => {
  // Use safe base URL construction identical to apiClient
  return `${getSafeBaseUrl()}/api/payments/proof/${paymentId}/${filename}`;
};

