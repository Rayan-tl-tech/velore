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
import { validateObjectIdParam } from '../middlewares/validateObjectId.js';

const router = express.Router();

router.post('/', authMiddleware, roleMiddleware('admin'), createCategoryController);
router.get('/', getAllCategoriesController);
router.get('/:id', validateObjectIdParam('id'), getCategoryByIdController);
router.put('/:id', authMiddleware, roleMiddleware('admin'), validateObjectIdParam('id'), updateCategoryController);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), validateObjectIdParam('id'), deleteCategoryController);

export default router;
