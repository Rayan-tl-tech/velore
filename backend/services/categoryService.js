import Category from '../models/categoryModel.js';

// Créer une catégorie
export const createCategory = async (data) => {
  const category = new Category(data);
  return await category.save();
};

// Récupérer toutes les catégories
export const getAllCategories = async () => {
  return await Category.find();
};

// Récupérer une catégorie par ID
export const getCategoryById = async (id) => {
  return await Category.findById(id);
};

// Mettre à jour une catégorie
export const updateCategory = async (id, updateData) => {
  return await Category.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
};

// Supprimer une catégorie
export const deleteCategory = async (id) => {
  return await Category.findByIdAndDelete(id);
};

