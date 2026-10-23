import express from 'express';
import {
  getProfileController,
  updateProfileController,
  getAllUsersController,
  getUserByIdController,
  updateUserRoleController,
  deleteUserController,
  getFavoritesController,
  addFavoriteController,
  removeFavoriteController,
} from '../controllers/userControler.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import roleMiddleware from '../middlewares/roleMiddleware.js';

const router = express.Router();

// User profile routes
router.get('/profile', authMiddleware, getProfileController);
router.put('/profile', authMiddleware, updateProfileController);

// User favorites routes (strictly authenticated, operating on req.user)
router.get('/favorites', authMiddleware, getFavoritesController);
router.post('/favorites/:productId', authMiddleware, addFavoriteController);
router.delete('/favorites/:productId', authMiddleware, removeFavoriteController);

// Administrative team / user management routes (Protected by JWT + Admin RBAC)
router.get('/', authMiddleware, roleMiddleware('admin'), getAllUsersController);
router.get('/:id', authMiddleware, roleMiddleware('admin'), getUserByIdController);
router.put('/:id/roles', authMiddleware, roleMiddleware('admin'), updateUserRoleController);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), deleteUserController);

export default router;



