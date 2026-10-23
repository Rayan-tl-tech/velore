import apiClient from './apiClient';

/**
 * Fetch all products (sorted by newest, category populated)
 * GET /api/products
 */
export const getAllProducts = async () => {
  const response = await apiClient.get('/products');
  return Array.isArray(response.data) ? response.data : [];
};

/**
 * Search products by keyword (case-insensitive, searches name & description)
 * GET /api/products/search?keyword=query
 */
export const searchProducts = async (keyword) => {
  const response = await apiClient.get('/products/search', {
    params: { keyword },
  });
  return Array.isArray(response.data) ? response.data : [];
};

/**
 * Fetch a single product by ID (category populated)
 * GET /api/products/:id
 */
export const getProductById = async (id) => {
  const response = await apiClient.get(`/products/${id}`);
  return response.data;
};

/**
 * Upload a product photo to storage (Admin only).
 * POST /api/upload
 * @param {File} file - Browser File object
 * @returns {Promise<{ success: boolean, url: string, publicId: string }>}
 */
export const uploadProductImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await apiClient.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/**
 * Create a new product (Admin only).
 * POST /api/products
 * Requires: Admin Bearer token
 * @param {FormData|object} data - product fields
 */
export const createProduct = async (data) => {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  const response = await apiClient.post('/products', data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' },
  });
  return response.data;
};

/**
 * Update an existing product (Admin only).
 * PUT /api/products/:id
 * Requires: Admin Bearer token
 * @param {string} id - Product ID
 * @param {FormData|object} data - product fields
 */
export const updateProduct = async (id, data) => {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  const response = await apiClient.put(`/products/${id}`, data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' },
  });
  return response.data;
};

/**
 * Delete a product (Admin only).
 * DELETE /api/products/:id
 * Requires: Admin Bearer token
 */
export const deleteProduct = async (id) => {
  const response = await apiClient.delete(`/products/${id}`);
  return response.data;
};
