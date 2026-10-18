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
 * Create a new product (Admin only).
 * POST /api/products
 * Requires: Admin Bearer token, multipart/form-data
 * @param {FormData} formData - fields: name, description, price, stock, category, image (file)
 */
export const createProduct = async (formData) => {
  const response = await apiClient.post('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/**
 * Update an existing product (Admin only).
 * PUT /api/products/:id
 * Requires: Admin Bearer token, multipart/form-data
 * @param {string} id - Product ID
 * @param {FormData} formData - fields: name, description, price, stock, category, image (file, optional)
 */
export const updateProduct = async (id, formData) => {
  const response = await apiClient.put(`/products/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
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
