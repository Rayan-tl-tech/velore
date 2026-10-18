import apiClient from './apiClient';

/**
 * Login a user
 * POST /api/auth/login
 * @returns {{ token, user }} token and user info
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
