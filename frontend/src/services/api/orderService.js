import apiClient from './apiClient';

/**
 * Place a new order by converting the authenticated user's cart into an order.
 * POST /api/orders
 * Requires: Bearer token
 */
export const createOrder = async (orderData = {}) => {
  const response = await apiClient.post('/orders', orderData);
  return response.data?.order || response.data;
};

/**
 * Fetch the authenticated customer's order history.
 * GET /api/orders/my
 * Requires: Bearer token
 */
export const getMyOrders = async () => {
  const response = await apiClient.get('/orders/my');
  return response.data;
};

/**
 * Fetch a specific order by ID (customer owner or admin).
 * GET /api/orders/:id
 * Requires: Bearer token
 */
export const getOrderById = async (orderId) => {
  const response = await apiClient.get(`/orders/${orderId}`);
  return response.data;
};

/**
 * Fetch all platform orders (Admin only).
 * GET /api/orders
 * Requires: Admin Bearer token
 */
export const getAllOrders = async () => {
  const response = await apiClient.get('/orders');
  return response.data;
};

/**
 * Update an order's status (Admin only).
 * PUT /api/orders/:id/status
 * Requires: Admin Bearer token
 * @param {string} orderId
 * @param {string} status - 'pending' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
 */
export const updateOrderStatus = async (orderId, status) => {
  const response = await apiClient.put(`/orders/${orderId}/status`, { status });
  return response.data;
};

/**
 * Delete an order (Admin only).
 * DELETE /api/orders/:id
 * Requires: Admin Bearer token
 * @param {string} orderId
 */
export const deleteOrder = async (orderId) => {
  const response = await apiClient.delete(`/orders/${orderId}`);
  return response.data;
};
