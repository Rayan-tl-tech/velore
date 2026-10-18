import fs from 'fs';
import productModel from '../models/productModel.js';

// Store uploaded file path so images are served efficiently as static assets
const processImage = (data, file) => {
  if (file && file.filename) {
    return `/uploads/${file.filename}`;
  }
  if (data?.image && typeof data.image === 'string' && data.image.trim()) {
    return data.image.trim();
  }
  return null;
};

// Créer un produit
export const createProduct = async (data, file) => {
  const { name, description, price, stock, category } = data;
  const image = processImage(data, file);

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

  if (stock === undefined || stock === null || stock === '' || !Number.isFinite(Number(stock))) {
    const err = new Error('Stock is required and must be a valid number');
    err.statusCode = 400;
    throw err;
  }

  const parsedStock = Number(stock);
  if (parsedStock < 0) {
    const err = new Error('Stock cannot be negative');
    err.statusCode = 400;
    throw err;
  }

  const newProduct = new productModel({
    name,
    description,
    price: parsedPrice,
    stock: parsedStock,
    image,
    category,
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
  return await productModel.findById(id).populate('category', 'name');
};

// Mettre à jour un produit
export const updateProduct = async (id, data, file) => {
  const updateData = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
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
    if (data.stock === null || data.stock === '' || isNaN(Number(data.stock))) {
      const err = new Error('Stock is required and must be a valid number');
      err.statusCode = 400;
      throw err;
    }
    const parsedStock = Number(data.stock);
    if (parsedStock < 0) {
      const err = new Error('Stock cannot be negative');
      err.statusCode = 400;
      throw err;
    }
    updateData.stock = parsedStock;
  }
  if (data.category !== undefined) updateData.category = data.category;
  if (file) {
    updateData.image = processImage(data, file);
  } else if (data.image !== undefined) {
    updateData.image = data.image ? String(data.image).trim() : null;
  }

  return await productModel
    .findByIdAndUpdate(id, updateData, { returnDocument: 'after', runValidators: true })
    .populate('category', 'name');
};

// Supprimer un produit
export const deleteProduct = async (id) => {
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




