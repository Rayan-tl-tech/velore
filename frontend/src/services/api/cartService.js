import apiClient from './apiClient';

/**
 * Fetch the authenticated user's cart (with populated product details)
 * GET /api/cart
 * Requires: Bearer token
 */
export const getCart = async () => {
  const response = await apiClient.get('/cart');
  return response.data;
};

/**
 * Add a product to the authenticated user's cart
 * POST /api/cart
 * Requires: Bearer token
 * @param {string} productId - MongoDB ObjectId of the product
 * @param {number} quantity - Quantity to add (min 1)
 */
export const addToCart = async (productId, quantity = 1, size = 'M', productName = '', color = null) => {
  const payload = { productId, quantity, size, productName };
  if (color) payload.color = String(color).trim();
  const response = await apiClient.post('/cart', payload);
  return response.data;
};

/**
 * Update quantity of a specific product in cart
 * PUT /api/cart/:productId
 * Requires: Bearer token
 */
export const updateCartItem = async (productId, quantity, size = 'M', color = undefined) => {
  const payload = { quantity, size };
  if (color !== undefined) payload.color = color ? String(color).trim() : null;
  const response = await apiClient.put(`/cart/${productId}`, payload);
  return response.data;
};

/**
 * Remove a product from the cart
 * DELETE /api/cart/:productId
 * Requires: Bearer token
 */
export const removeFromCart = async (productId, size = 'M', color = undefined) => {
  const params = {};
  if (size) params.size = size;
  if (color !== undefined && color !== null) params.color = String(color).trim();
  const response = await apiClient.delete(`/cart/${productId}`, { params });
  return response.data;
};

/**
 * Empty the authenticated user's cart
 * DELETE /api/cart
 * Requires: Bearer token
 */
export const clearCart = async () => {
  const response = await apiClient.delete('/cart');
  return response.data;
};
