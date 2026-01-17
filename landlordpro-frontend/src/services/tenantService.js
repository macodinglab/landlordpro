import apiClient from './apiClient';

const BASE_PATH = '/tenants';

/**
 * 📄 Get all tenants (with pagination and optional search)
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} search - Optional search term (name/email/phone)
 */
export const getAllTenants = async (page = 1, limit = 10, search = '') => {
  const params = { page, limit };
  if (search) params.search = search;

  const response = await apiClient.get(BASE_PATH, { params });
  return response.data; // { tenants, totalPages, page }
};

/**
 * 📋 Get tenant by ID
 * @param {string} id
 */
export const getTenantById = async (id) => {
  const response = await apiClient.get(`${BASE_PATH}/${id}`);
  return response.data.tenant;
};

/**
 * ➕ Create new tenant
 * @param {object} data - { name, email, phone, company_name?, tin_number? }
 */
export const createTenant = async (data) => {
  const response = await apiClient.post(BASE_PATH, data);
  return response.data.tenant;
};

/**
 * ✏️ Update tenant
 * @param {string} id
 * @param {object} data - { name, email, phone, company_name?, tin_number? }
 */
export const updateTenant = async (id, data) => {
  const response = await apiClient.put(`${BASE_PATH}/${id}`, data);
  return response.data.tenant;
};

/**
 * 🗑️ Soft delete tenant
 * @param {string} id
 */
export const deleteTenant = async (id) => {
  const response = await apiClient.delete(`${BASE_PATH}/${id}`);
  return response.data.message;
};

/**
 * ♻️ Restore tenant (Admin only)
 * @param {string} id
 */
export const restoreTenant = async (id) => {
  const response = await apiClient.patch(`${BASE_PATH}/${id}/restore`);
  return response.data.tenant;
};
