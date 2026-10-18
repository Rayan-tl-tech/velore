import express from 'express';
import { 
  createCategoryController, 
  getAllCategoriesController, 
  getCategoryByIdController, 
  updateCategoryController, 
  deleteCategoryController 
} from '../controllers/categoryController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import roleMiddleware from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, roleMiddleware('admin'), createCategoryController);
router.get('/', getAllCategoriesController);
router.get('/:id', getCategoryByIdController);
router.put('/:id', authMiddleware, roleMiddleware('admin'), updateCategoryController);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), deleteCategoryController);

export default router;
