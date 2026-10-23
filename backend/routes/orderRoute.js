import express from 'express';
import {
  createOrderController,
  getMyOrdersController,
  getAllOrdersController,
  getOrderByIdController,
  updateOrderStatusController,
  deleteOrderController,
} from '../controllers/orderController.js';
import authMiddleware, { optionalAuthMiddleware } from '../middlewares/authMiddleware.js';
import roleMiddleware from '../middlewares/roleMiddleware.js';
import { validateObjectIdParam } from '../middlewares/validateObjectId.js';

const router = express.Router();

// Order creation: supports both guests and authenticated users
router.post('/', optionalAuthMiddleware, createOrderController);

// Customer personal orders: strictly authenticated
router.get('/my', authMiddleware, getMyOrdersController);

// Single order view: admin, owner, or guest with token
router.get('/:id', validateObjectIdParam('id'), optionalAuthMiddleware, getOrderByIdController);

// Admin-only endpoints
router.get('/', authMiddleware, roleMiddleware('admin'), getAllOrdersController);
router.put('/:id/status', authMiddleware, roleMiddleware('admin'), validateObjectIdParam('id'), updateOrderStatusController);
router.put('/:id', authMiddleware, roleMiddleware('admin'), validateObjectIdParam('id'), updateOrderStatusController);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), validateObjectIdParam('id'), deleteOrderController);

export default router;
