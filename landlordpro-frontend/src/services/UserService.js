// src/services/userService.js
import apiClient from './apiClient';

/* ----------------------------------------
   ⚠️ Centralized Error Handler
---------------------------------------- */
const handleRequest = async (promise, customErrorMsg = null) => {
  try {
    const res = await promise;
    return res.data;
  } catch (err) {
    const status = err.response?.status;
    const message =
      err.response?.data?.message ||
      customErrorMsg ||
      `Request failed${status ? ` (HTTP ${status})` : ''}`;

    console.error('API Error:', message, err.response?.data || err.message);
    throw new Error(message);
  }
};

/* ================================
   👥 USER MANAGEMENT
================================ */
export const getAllUsers = async (page = 1, limit = 10) => {
  const data = await handleRequest(apiClient.get(`/users?page=${page}&limit=${limit}`));
  return {
    users: data.rows || [],
    total: data.count || 0,
    totalPages: Math.ceil((data.count || 0) / limit),
    page,
  };
};

export const updateUser = (id, userObj) =>
  handleRequest(apiClient.put(`/users/${id}`, userObj));

export const disableUser = (id) =>
  handleRequest(apiClient.put(`/users/${id}/disable`));

export const enableUser = (id) =>
  handleRequest(apiClient.put(`/users/${id}/enable`));

export const registerUser = (userObj) =>
  handleRequest(apiClient.post('/auth/register', userObj));

/* ================================
   👤 PROFILE
================================ */
export const getProfile = () => handleRequest(apiClient.get('/profile'));

// Update profile with only the fields backend expects
export const updateProfile = (data) =>
  handleRequest(apiClient.put('/profile', data));

// Update password
export const updatePassword = (payload) =>
  handleRequest(apiClient.put('/profile/password', payload));

// Upload avatar/profile picture
export const uploadAvatar = (file) => {
  const formData = new FormData();
  formData.append('avatar', file);

  return handleRequest(
    apiClient.put('/profile/picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  );
};

/* ================================
   🔔 NOTIFICATIONS
================================ */
export const getNotifications = (page = 1, limit = 10) =>
  handleRequest(apiClient.get(`/notifications?page=${page}&limit=${limit}`));

export const getUnreadNotifications = (page = 1, limit = 10) =>
  handleRequest(apiClient.get(`/notifications/unread?page=${page}&limit=${limit}`));

export const markNotificationRead = (id) =>
  handleRequest(apiClient.put(`/notifications/${id}/read`));

/* ================================
   🔑 AUTH (Login/Register)
================================ */
export const loginUser = (email, password) =>
  handleRequest(apiClient.post('/auth/login', { email, password }));

export const getAllManagers = async () => {
  const { users } = await getAllUsers(1, 1000);
  return users.filter(user => user.role === 'manager' && user.is_active);
};
