import { 
  createCategory, 
  getAllCategories, 
  getCategoryById, 
  updateCategory, 
  deleteCategory
} from '../services/categoryService.js';

// Créer une catégorie
const createCategoryController = async (req, res) => {
  try {
    const category = await createCategory(req.body);
    res.status(201).json(category);
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ error: error.message, success: false });
  }
};

// Récupérer toutes les catégories
const getAllCategoriesController = async (_req, res) => {
  try {
    const categories = await getAllCategories();
    res.status(200).json(categories);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message, success: false });
  }
};

// Récupérer une catégorie par ID
const getCategoryByIdController = async (req, res) => {
  try {
    const category = await getCategoryById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found', success: false });
    }
    res.status(200).json(category);
  } catch (error) {
    const statusCode = error.statusCode || (error.message.includes('identifier') ? 400 : 500);
    res.status(statusCode).json({ error: error.message, success: false });
  }
};

// Mettre à jour une catégorie
const updateCategoryController = async (req, res) => {
  try {
    const category = await updateCategory(req.params.id, req.body);
    if (!category) {
      return res.status(404).json({ error: 'Category not found', success: false });
    }
    res.status(200).json(category);
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ error: error.message, success: false });
  }
};

// Supprimer une catégorie
const deleteCategoryController = async (req, res) => {
  try {
    const category = await deleteCategory(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found', success: false });
    }
    res.status(200).json({ message: 'Category deleted successfully', success: true });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ error: error.message, success: false });
  }
};

export { 
  createCategoryController, 
  getAllCategoriesController, 
  getCategoryByIdController, 
  updateCategoryController, 
  deleteCategoryController 
};
