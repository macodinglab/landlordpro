import apiClient from './apiClient';

/* -------------------- Constants -------------------- */
const BASE_PATH = '/expenses';

const STORAGE_KEYS = {
  TOKEN: 'token',
};

const ROUTES = {
  LOGIN: '/login',
};

/* -------------------- Custom Error Class -------------------- */
class ApiError extends Error {
  constructor(response, originalError) {
    super(response?.data?.message || originalError.message || 'API Error');
    this.name = 'ApiError';
    this.status = response?.status;
    this.code = response?.data?.code;
    this.data = response?.data;
    this.originalError = originalError;
  }

  isNetworkError() {
    return !this.status;
  }

  isServerError() {
    return this.status >= 500;
  }

  isClientError() {
    return this.status >= 400 && this.status < 500;
  }
}

/* -------------------- Safe Request Wrapper -------------------- */
// Wraps apiClient calls to preserve the existing error handling contract
const safeRequest = async (requestFn) => {
  try {
    return await requestFn();
  } catch (error) {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      // Dispatch custom event instead of hard redirect
      window.dispatchEvent(new CustomEvent('auth:logout', {
        detail: { message: 'Session expired. Please login again.' }
      }));
    }
    // Return custom error
    throw new ApiError(error.response, error);
  }
};

/* -------------------- HELPER FUNCTIONS -------------------- */

/**
 * Calculate VAT amount from total amount and VAT rate
 * @param {number} amount - Total amount including VAT
 * @param {number} vatRate - VAT rate (e.g., 18 for 18%, or 0.18)
 * @returns {number} VAT amount
 */
export const calculateVAT = (amount, vatRate) => {
  if (!amount || !vatRate) return 0;
  const rate = parseFloat(vatRate) > 1 ? parseFloat(vatRate) / 100 : parseFloat(vatRate);
  return parseFloat((amount - (amount / (1 + rate))).toFixed(2));
};

/**
 * Convert an object to FormData with backend-compatible format
 * @param {Object} data
 * @returns {FormData}
 */
const toFormData = (data) => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    // Skip only null and undefined, allow empty strings
    if (value === null || value === undefined) return;

    if (value instanceof File) {
      // Files use their expected key name
      formData.append(key, value);
    } else if (value instanceof Date) {
      formData.append(key, value.toISOString().split('T')[0]); // YYYY-MM-DD format
    } else if (Array.isArray(value)) {
      // Handle arrays by appending each item
      value.forEach(item => formData.append(`${key}[]`, item));
    } else if (typeof value === 'object') {
      // Don't stringify - flatten nested objects
      Object.entries(value).forEach(([subKey, subValue]) => {
        if (subValue !== null && subValue !== undefined) {
          formData.append(`${key}.${subKey}`, String(subValue));
        }
      });
    } else {
      formData.append(key, String(value));
    }
  });

  return formData;
};

/**
 * Log FormData contents (only in development)
 * @param {FormData} formData
 * @param {string} context
 */
const logFormData = (formData, context = 'FormData') => {
  if (import.meta.env.DEV) {
    console.log(`=== ${context} ===`);
    for (let pair of formData.entries()) {
      // Don't log file contents, just filename
      const value = pair[1] instanceof File ? `[File: ${pair[1].name}]` : pair[1];
      console.log(`${pair[0]}: ${value}`);
    }
  }
};

/**
 * Normalize API response to consistent shape
 * @param {Object} response - Axios response
 * @returns {Object} Normalized response
 */
const unwrapResponse = (response) => {
  return {
    data: response.data.data || response.data,
    success: response.data.success ?? true,
    message: response.data.message,
    pagination: response.data.pagination,
  };
};

/**
 * Detect if data contains files
 * @param {Object} data
 * @returns {boolean}
 */
const hasFiles = (data) => {
  return Object.values(data).some(value => value instanceof File);
};

/* -------------------- EXPENSE API FUNCTIONS -------------------- */

/**
 * Get all expenses with optional filters and pagination
 * @returns {Promise<Object>} Expenses with pagination info
 * @throws {ApiError} When request fails
 */
export const getAllExpenses = async ({
  page = 1,
  limit = 10,
  propertyId = '',
  localId = '',
  category = '',
  paymentStatus = '',
  currency = '',
  startDate = '',
  endDate = '',
  minAmount = '',
  maxAmount = '',
  search = '',
  includeDeleted = false,
} = {}, signal = null) => {
  const offset = (page - 1) * limit;
  const params = { offset, limit };

  if (propertyId) params.propertyId = propertyId;
  if (localId) params.localId = localId;
  if (category) params.category = category;
  if (paymentStatus) params.paymentStatus = paymentStatus;
  if (currency) params.currency = currency;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (minAmount) params.minAmount = minAmount;
  if (maxAmount) params.maxAmount = maxAmount;
  if (search) params.search = search;
  if (includeDeleted) params.includeDeleted = includeDeleted;

  const response = await safeRequest(() => apiClient.get(BASE_PATH, { params, signal }));
  return unwrapResponse(response);
};

/**
 * Get a single expense by ID
 * @returns {Promise<Object>} Expense data
 * @throws {ApiError} When request fails
 */
export const getExpenseById = async (id, signal = null) => {
  const response = await safeRequest(() => apiClient.get(`${BASE_PATH}/${id}`, { signal }));
  return unwrapResponse(response).data;
};

/**
 * Create a new expense
 * @returns {Promise<Object>} Created expense data
 * @throws {ApiError} When request fails
 */
export const createExpense = async (data, onProgress = null) => {
  // Auto-calculate VAT if not provided
  if (data.amount && data.vatRate && !data.vatAmount) {
    data.vatAmount = calculateVAT(data.amount, data.vatRate);
  }

  // Prepare data - convert to backend format
  let payload;

  if (data instanceof FormData) {
    payload = data;
  } else {
    // Clean the data before sending
    const cleanData = {
      description: data.description,
      amount: parseFloat(data.amount),
      vat_rate: parseFloat(data.vatRate) || 0,
      vat_amount: parseFloat(data.vatAmount) || 0,
      category: data.category,
      payment_status: data.paymentStatus,
      payment_date: data.paymentDate || null,
      payment_method: data.paymentMethod || null,
      due_date: data.dueDate || null,
      property_id: data.propertyId,
      local_id: data.localId || null,
      currency: data.currency,
      vendor: data.vendor || null,
      invoice_number: data.invoiceNumber || null,
    };

    // Add file if present
    if (data.proofFile) {
      cleanData.proof_file = data.proofFile;
    }

    payload = toFormData(cleanData);
  }

  logFormData(payload, 'CREATE EXPENSE');

  const response = await safeRequest(() => apiClient.post(BASE_PATH, payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress ? (progressEvent) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      onProgress(percentCompleted);
    } : undefined,
  }));

  return unwrapResponse(response).data;
};

/**
 * Update an existing expense
 * @returns {Promise<Object>} Updated expense data
 * @throws {ApiError} When request fails
 */
export const updateExpense = async (id, data, onProgress = null) => {
  // Auto-calculate VAT if amount or rate changed
  if (data.amount && data.vatRate && !data.vatAmount) {
    data.vatAmount = calculateVAT(data.amount, data.vatRate);
  }

  // Detect if we have files - if not, send as JSON for efficiency
  const hasFileData = data instanceof FormData || hasFiles(data);

  if (hasFileData) {
    let payload;

    if (data instanceof FormData) {
      payload = data;
    } else {
      // Clean the data before sending
      const cleanData = {
        description: data.description,
        amount: parseFloat(data.amount),
        vat_rate: parseFloat(data.vatRate) || 0,
        vat_amount: parseFloat(data.vatAmount) || 0,
        category: data.category,
        payment_status: data.paymentStatus,
        payment_date: data.paymentDate || null,
        payment_method: data.paymentMethod || null,
        due_date: data.dueDate || null,
        property_id: data.propertyId,
        local_id: data.localId || null,
        currency: data.currency,
        vendor: data.vendor || null,
        invoice_number: data.invoiceNumber || null,
      };

      // Add file if present
      if (data.proofFile) {
        cleanData.proof_file = data.proofFile;
      }

      payload = toFormData(cleanData);
    }

    logFormData(payload, 'UPDATE EXPENSE');

    const response = await safeRequest(() => apiClient.put(`${BASE_PATH}/${id}`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress ? (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      } : undefined,
    }));

    return unwrapResponse(response).data;
  } else {
    // Send as JSON if no files - convert keys to snake_case
    const jsonPayload = {
      description: data.description,
      amount: parseFloat(data.amount),
      vat_rate: parseFloat(data.vatRate) || 0,
      vat_amount: parseFloat(data.vatAmount) || 0,
      category: data.category,
      payment_status: data.paymentStatus,
      payment_date: data.paymentDate || null,
      payment_method: data.paymentMethod || null,
      due_date: data.dueDate || null,
      property_id: data.propertyId,
      local_id: data.localId || null,
      currency: data.currency,
      vendor: data.vendor || null,
      invoice_number: data.invoiceNumber || null,
    };

    const response = await safeRequest(() => apiClient.put(`${BASE_PATH}/${id}`, jsonPayload));
    return unwrapResponse(response).data;
  }
};

/**
 * Soft delete an expense
 * @returns {Promise<Object>} Deletion result
 * @throws {ApiError} When request fails
 */
export const deleteExpense = async (id) => {
  const response = await safeRequest(() => apiClient.delete(`${BASE_PATH}/${id}`));
  return unwrapResponse(response);
};

/**
 * Hard delete an expense permanently
 * @returns {Promise<Object>} Deletion result
 * @throws {ApiError} When request fails
 */
export const hardDeleteExpense = async (id) => {
  const response = await safeRequest(() => apiClient.delete(`${BASE_PATH}/${id}/hard`));
  return unwrapResponse(response);
};

/**
 * Restore a soft-deleted expense
 * @returns {Promise<Object>} Restored expense data
 * @throws {ApiError} When request fails
 */
export const restoreExpense = async (id) => {
  const response = await safeRequest(() => apiClient.patch(`${BASE_PATH}/${id}/restore`));
  return unwrapResponse(response).data;
};

/**
 * Approve an expense
 * @returns {Promise<Object>} Approved expense data
 * @throws {ApiError} When request fails
 */
export const approveExpense = async (id, approvedBy) => {
  const response = await safeRequest(() => apiClient.patch(`${BASE_PATH}/${id}/approve`, { approvedBy }));
  return unwrapResponse(response).data;
};

/**
 * Get expense summary / analytics
 * @returns {Promise<Object>} Summary data
 * @throws {ApiError} When request fails
 */
export const getExpenseSummary = async (filters = {}, signal = null) => {
  const response = await safeRequest(() => apiClient.get(`${BASE_PATH}/summary`, { params: filters, signal }));
  return unwrapResponse(response).data;
};

/**
 * Get overdue expenses
 * @returns {Promise<Object>} Overdue expenses
 * @throws {ApiError} When request fails
 */
export const getOverdueExpenses = async (filters = {}, signal = null) => {
  const response = await safeRequest(() => apiClient.get(`${BASE_PATH}/overdue`, { params: filters, signal }));
  return unwrapResponse(response).data;
};

/**
 * Get expenses by entity (property or local)
 * @returns {Promise<Object>} Entity expenses
 * @throws {ApiError} When request fails
 */
export const getExpensesByEntity = async (entityType, entityId, filters = {}, signal = null) => {
  const response = await safeRequest(() => apiClient.get(`${BASE_PATH}/entity/${entityType}/${entityId}`, {
    params: filters,
    signal
  }));
  return unwrapResponse(response).data;
};

/**
 * Bulk update payment status for multiple expenses
 * @returns {Promise<Object>} Update result
 * @throws {ApiError} When request fails
 */
export const bulkUpdatePaymentStatus = async ({ expenseIds, paymentStatus, paymentDate, paymentMethod }) => {
  const response = await safeRequest(() => apiClient.patch(`${BASE_PATH}/bulk/payment-status`, {
    expenseIds,
    paymentStatus,
    paymentDate,
    paymentMethod,
  }));
  return unwrapResponse(response);
};

/**
 * Get proof file as blob
 * @returns {Promise<Blob>} File blob
 * @throws {ApiError} When request fails
 */
export const getProofFile = async (expenseId, filename) => {
  const response = await safeRequest(() => apiClient.get(`${BASE_PATH}/${expenseId}/proof/${filename}`, {
    responseType: 'blob',
  }));
  return response.data;
};

/**
 * Download proof file
 * @returns {Promise<void>}
 * @throws {ApiError} When request fails
 */
export const downloadProof = async (expenseId, filename) => {
  const blob = await getProofFile(expenseId, filename);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Get proof file preview URL
 * @returns {Promise<string>} Object URL (remember to revoke with URL.revokeObjectURL)
 * @throws {ApiError} When request fails
 */
export const getProofPreviewUrl = async (expenseId, filename) => {
  const blob = await getProofFile(expenseId, filename);
  return window.URL.createObjectURL(blob);
};

/* -------------------- EXPORT FOR TESTING -------------------- */
export const _axiosInstance = apiClient;