import fs from 'fs';
import productModel from '../models/productModel.js';
import Category from '../models/categoryModel.js';
import { uploadImage, deleteImage } from './storageService.js';
import { isValidObjectId } from '../middlewares/validateObjectId.js';

// Créer un produit
export const createProduct = async (data, file) => {
  if (!data || typeof data !== 'object') {
    const err = new Error('Product data must be an object');
    err.statusCode = 400;
    throw err;
  }

  const { name, description, price, stock, category } = data;
  let image = null;

  if (file) {
    const uploadResult = await uploadImage(file);
    image = uploadResult.url;
  } else if (data?.image && typeof data.image === 'string' && data.image.trim()) {
    image = data.image.trim();
  }

  // Name validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    const err = new Error('Product name is required');
    err.statusCode = 400;
    throw err;
  }
  const trimmedName = name.trim();

  // Price validation
  if (price === undefined || price === null || price === '' || !Number.isFinite(Number(price))) {
    const err = new Error('Price is required and must be a valid number');
    err.statusCode = 400;
    throw err;
  }

  const parsedPrice = Number(price);
  if (parsedPrice < 0) {
    const err = new Error('Price cannot be negative');
    err.statusCode = 400;
    throw err;
  }

  // Stock validation
  if (stock === undefined || stock === null || stock === '' || !Number.isFinite(Number(stock))) {
    const err = new Error('Stock is required and must be a valid number');
    err.statusCode = 400;
    throw err;
  }

  const parsedStock = Number(stock);
  if (parsedStock < 0 || !Number.isInteger(parsedStock)) {
    const err = new Error('Stock cannot be negative and must be an integer');
    err.statusCode = 400;
    throw err;
  }

  // Category validation (format & existence check)
  const categoryId = typeof category === 'object' && category?._id ? category._id : category;
  if (!categoryId || !isValidObjectId(String(categoryId))) {
    const err = new Error('A valid category identifier is required');
    err.statusCode = 400;
    throw err;
  }

  const existingCategory = await Category.findById(categoryId);
  if (!existingCategory) {
    const err = new Error('Specified category does not exist');
    err.statusCode = 404;
    throw err;
  }

  const cleanDescription = typeof description === 'string' ? description.trim() : '';

  const newProduct = new productModel({
    name: trimmedName,
    description: cleanDescription,
    price: parsedPrice,
    stock: parsedStock,
    image,
    category: categoryId,
  });

  const savedProduct = await newProduct.save();
  return await savedProduct.populate('category', 'name');
};

// Récupérer tous les produits
export const getAllProducts = async () => {
  return await productModel.find().populate('category', 'name').sort({ createdAt: -1 });
};

// Récupérer un produit par ID
export const getProductById = async (id) => {
  if (!isValidObjectId(id)) {
    const err = new Error('Invalid product identifier format');
    err.statusCode = 400;
    throw err;
  }

  const product = await productModel.findById(id).populate('category', 'name');
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }
  return product;
};

// Mettre à jour un produit
export const updateProduct = async (id, data, file) => {
  if (!isValidObjectId(id)) {
    const err = new Error('Invalid product identifier format');
    err.statusCode = 400;
    throw err;
  }

  const existingProduct = await productModel.findById(id);
  if (!existingProduct) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  // Strict allowlist of updatable product fields
  const updateData = {};

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      const err = new Error('Product name must be a non-empty string');
      err.statusCode = 400;
      throw err;
    }
    updateData.name = data.name.trim();
  }

  if (data.description !== undefined) {
    updateData.description = typeof data.description === 'string' ? data.description.trim() : '';
  }

  if (data.price !== undefined) {
    if (data.price === null || data.price === '' || !Number.isFinite(Number(data.price))) {
      const err = new Error('Price must be a valid number');
      err.statusCode = 400;
      throw err;
    }
    const parsedPrice = Number(data.price);
    if (parsedPrice < 0) {
      const err = new Error('Price cannot be negative');
      err.statusCode = 400;
      throw err;
    }
    updateData.price = parsedPrice;
  }

  if (data.stock !== undefined) {
    if (data.stock === null || data.stock === '' || !Number.isFinite(Number(data.stock))) {
      const err = new Error('Stock is required and must be a valid number');
      err.statusCode = 400;
      throw err;
    }
    const parsedStock = Number(data.stock);
    if (parsedStock < 0 || !Number.isInteger(parsedStock)) {
      const err = new Error('Stock cannot be negative and must be an integer');
      err.statusCode = 400;
      throw err;
    }
    updateData.stock = parsedStock;
  }

  if (data.category !== undefined) {
    const categoryId = typeof data.category === 'object' && data.category?._id ? data.category._id : data.category;
    if (!categoryId || !isValidObjectId(String(categoryId))) {
      const err = new Error('Invalid category identifier format');
      err.statusCode = 400;
      throw err;
    }
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      const err = new Error('Specified category does not exist');
      err.statusCode = 404;
      throw err;
    }
    updateData.category = categoryId;
  }

  if (file) {
    const uploadResult = await uploadImage(file);
    updateData.image = uploadResult.url;
    // Safely delete previous image if replaced
    if (existingProduct.image && existingProduct.image !== updateData.image) {
      await deleteImage(existingProduct.image);
    }
  } else if (data.image !== undefined) {
    const newImageUrl = data.image ? String(data.image).trim() : null;
    updateData.image = newImageUrl;
    if (existingProduct.image && newImageUrl && existingProduct.image !== newImageUrl) {
      await deleteImage(existingProduct.image);
    }
  }

  return await productModel
    .findByIdAndUpdate(id, updateData, { returnDocument: 'after', runValidators: true })
    .populate('category', 'name');
};

// Supprimer un produit
export const deleteProduct = async (id) => {
  if (!isValidObjectId(id)) {
    const err = new Error('Invalid product identifier format');
    err.statusCode = 400;
    throw err;
  }

  const product = await productModel.findById(id);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  if (product?.image) {
    await deleteImage(product.image);
  }
  return await productModel.findByIdAndDelete(id);
};

// BARRE DE RECHERCHE
export const searchProducts = async (keyword) => {
  const trimmed = typeof keyword === 'string' ? keyword.trim() : '';
  if (!trimmed) {
    return await productModel.find().populate('category', 'name').sort({ createdAt: -1 });
  }
  // Escape regex special characters to prevent ReDoS and unhandled syntax exceptions
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');
  return await productModel.find({
    $or: [
      { name: { $regex: regex } },
      { description: { $regex: regex } }
    ]
  }).populate('category', 'name').sort({ createdAt: -1 });
};
