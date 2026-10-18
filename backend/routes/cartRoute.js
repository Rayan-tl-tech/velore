import express from 'express';
import {
  addToCartController,
  getCartController,
  updateCartItemController,
  removeFromCartController
} from '../controllers/cartController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, addToCartController);
router.get('/', authMiddleware, getCartController);
router.put('/:productId', authMiddleware, updateCartItemController);
router.delete('/:productId', authMiddleware, removeFromCartController);

export default router;
