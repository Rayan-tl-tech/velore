import apiClient from './apiClient';

/**
 * Fetch all categories
 * GET /api/categories
 */
export const getAllCategories = async () => {
  const response = await apiClient.get('/categories');
  return Array.isArray(response.data) ? response.data : [];
};

/**
 * Create a new category (no auth required by backend, but admin-only in practice)
 * POST /api/categories
 * @param {{ name: string }} data
 */
export const createCategory = async (data) => {
  const response = await apiClient.post('/categories', data);
  return response.data;
};

/**
 * Update a category by ID
 * PUT /api/categories/:id
 * @param {string} id
 * @param {{ name: string }} data
 */
export const updateCategory = async (id, data) => {
  const response = await apiClient.put(`/categories/${id}`, data);
  return response.data;
};

/**
 * Delete a category by ID
 * DELETE /api/categories/:id
 * @param {string} id
 */
export const deleteCategory = async (id) => {
  const response = await apiClient.delete(`/categories/${id}`);
  return response.data;
};
