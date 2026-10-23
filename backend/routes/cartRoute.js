import express from 'express';
import {
  addToCartController,
  getCartController,
  updateCartItemController,
  removeFromCartController,
  clearCartController,
} from '../controllers/cartController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { validateObjectIdParam } from '../middlewares/validateObjectId.js';

const router = express.Router();

router.post('/', authMiddleware, addToCartController);
router.get('/', authMiddleware, getCartController);
router.delete('/', authMiddleware, clearCartController);
router.put('/:productId', authMiddleware, validateObjectIdParam('productId'), updateCartItemController);
router.delete('/:productId', authMiddleware, validateObjectIdParam('productId'), removeFromCartController);

export default router;
