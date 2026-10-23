import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import { isValidObjectId } from '../middlewares/validateObjectId.js';

/**
 * Validates category request payload against a strict allowlist.
 * Rejects arbitrary fields, non-string types, nested objects (NoSQL injection), arrays, and invalid lengths.
 *
 * @param {object} data
 * @param {boolean} isUpdate
 * @returns {{ name: string }}
 */
const validateCategoryPayload = (data, isUpdate = false) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    const err = new Error('Request payload must be a valid JSON object');
    err.statusCode = 400;
    throw err;
  }

  // Allowlist: only 'name' is permitted
  const allowedFields = ['name'];
  const extraFields = Object.keys(data).filter((key) => !allowedFields.includes(key));
  if (extraFields.length > 0) {
    const err = new Error(`Arbitrary fields not allowed: ${extraFields.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  if (!isUpdate || data.name !== undefined) {
    if (data.name === undefined || data.name === null) {
      const err = new Error('Category name is required');
      err.statusCode = 400;
      throw err;
    }

    if (typeof data.name !== 'string') {
      const err = new Error('Category name must be a string');
      err.statusCode = 400;
      throw err;
    }

    const trimmed = data.name.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      const err = new Error('Category name must be between 2 and 50 characters long');
      err.statusCode = 400;
      throw err;
    }

    return { name: trimmed };
  }

  return {};
};

/**
 * Créer une catégorie
 * MEDIUM-01: Strict category input validation & uniqueness check
 */
export const createCategory = async (data) => {
  const { name } = validateCategoryPayload(data, false);

  // Case-insensitive duplicate check
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existing = await Category.findOne({ name: { $regex: new RegExp(`^${escaped}$`, 'i') } });
  if (existing) {
    const err = new Error(`Category "${name}" already exists`);
    err.statusCode = 400;
    throw err;
  }

  const category = new Category({ name });
  return await category.save();
};

/**
 * Récupérer toutes les catégories
 */
export const getAllCategories = async () => {
  return await Category.find().sort({ createdAt: -1 });
};

/**
 * Récupérer une catégorie par ID
 * MEDIUM-04: ObjectId validation
 */
export const getCategoryById = async (id) => {
  if (!isValidObjectId(id)) {
    const err = new Error('Invalid category identifier format');
    err.statusCode = 400;
    throw err;
  }
  return await Category.findById(id);
};

/**
 * Mettre à jour une catégorie
 * MEDIUM-01: Strict category input validation, field allowlist, & duplicate check
 */
export const updateCategory = async (id, updateData) => {
  if (!isValidObjectId(id)) {
    const err = new Error('Invalid category identifier format');
    err.statusCode = 400;
    throw err;
  }

  const existingCategory = await Category.findById(id);
  if (!existingCategory) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }

  const validated = validateCategoryPayload(updateData, true);
  if (!validated.name) {
    return existingCategory;
  }

  // Check if new name conflicts with an existing category
  const escaped = validated.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const duplicate = await Category.findOne({
    name: { $regex: new RegExp(`^${escaped}$`, 'i') },
    _id: { $ne: id },
  });

  if (duplicate) {
    const err = new Error(`Category "${validated.name}" already exists`);
    err.statusCode = 400;
    throw err;
  }

  return await Category.findByIdAndUpdate(
    id,
    { name: validated.name },
    { returnDocument: 'after', runValidators: true }
  );
};

/**
 * Supprimer une catégorie
 * MEDIUM-03: Referential integrity check — prevents orphaned products
 */
export const deleteCategory = async (id) => {
  if (!isValidObjectId(id)) {
    const err = new Error('Invalid category identifier format');
    err.statusCode = 400;
    throw err;
  }

  const category = await Category.findById(id);
  if (!category) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }

  // Check for active products referencing this category
  const activeProductsCount = await Product.countDocuments({ category: id });
  if (activeProductsCount > 0) {
    const err = new Error(
      `Cannot delete category "${category.name}". It is currently assigned to ${activeProductsCount} active product(s). Please reassign or delete these products first.`
    );
    err.statusCode = 409;
    throw err;
  }

  return await Category.findByIdAndDelete(id);
};

export default {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
