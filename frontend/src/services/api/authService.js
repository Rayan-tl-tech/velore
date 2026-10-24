import apiClient from './apiClient';

/**
 * Login a user
 * POST /api/auth/login
 * @returns {{ accessToken, token, user }}
 */
export const login = async (email, password) => {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
};

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (name, email, password) => {
  const response = await apiClient.post('/auth/register', { name, email, password });
  return response.data;
};

/**
 * Refresh access token using HttpOnly cookie session
 * POST /api/auth/refresh
 */
export const refreshToken = async () => {
  const response = await apiClient.post('/auth/refresh');
  return response.data;
};

/**
 * Terminate current session and clear HttpOnly cookie
 * POST /api/auth/logout
 */
export const logout = async () => {
  try {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  } catch {
    return { success: true };
  }
};

/**
 * Terminate all active sessions across all devices
 * POST /api/auth/logout-all
 */
export const logoutAll = async () => {
  const response = await apiClient.post('/auth/logout-all');
  return response.data;
};

export default {
  login,
  register,
  refreshToken,
  logout,
  logoutAll,
};
