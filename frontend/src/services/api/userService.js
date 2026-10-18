import apiClient from './apiClient';

/**
 * Fetch authenticated user's profile.
 * GET /api/users/profile
 * Requires: Bearer token
 */
export const getProfile = async () => {
  const response = await apiClient.get('/users/profile');
  return response.data;
};

/**
 * Update authenticated user's profile.
 * PUT /api/users/profile
 * Requires: Bearer token
 * @param {object} data - { name, email, ... }
 */
export const updateProfile = async (data) => {
  const response = await apiClient.put('/users/profile', data);
  return response.data;
};

/**
 * Fetch all users with optional search filter (Admin only).
 * GET /api/users?search=...
 * Requires: Bearer token + admin role
 */
export const getAllUsers = async (search = '') => {
  const params = search?.trim() ? { search: search.trim() } : {};
  const response = await apiClient.get('/users', { params });
  return response.data;
};

/**
 * Fetch single user by ID (Admin only).
 * GET /api/users/:id
 * Requires: Bearer token + admin role
 */
export const getUserById = async (id) => {
  const response = await apiClient.get(`/users/${id}`);
  return response.data;
};

/**
 * Update user role (promote to admin or demote to user) (Admin only).
 * PUT /api/users/:id/roles
 * Requires: Bearer token + admin role
 * @param {string} id - Target user ID
 * @param {string} action - 'promote' | 'demote' | 'admin' | 'user'
 */
export const updateUserRole = async (id, action) => {
  const response = await apiClient.put(`/users/${id}/roles`, { action });
  return response.data;
};

/**
 * Delete user account (Admin only).
 * DELETE /api/users/:id
 * Requires: Bearer token + admin role
 */
export const deleteUser = async (id) => {
  const response = await apiClient.delete(`/users/${id}`);
  return response.data;
};

