import Cart from '../models/cartModel.js';
import Product from '../models/productModel.js';
import { isValidObjectId } from '../middlewares/validateObjectId.js';

const validateUserId = (userId) => {
  const idStr = String(userId?._id || userId || '');
  if (!isValidObjectId(idStr)) {
    const err = new Error('Invalid user ID format');
    err.statusCode = 400;
    throw err;
  }
};

const validateProductId = (productId) => {
  const idStr = String(productId?._id || productId || '');
  if (!isValidObjectId(idStr)) {
    const err = new Error('Invalid product ID format');
    err.statusCode = 400;
    throw err;
  }
};

const validateQuantity = (quantity) => {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty < 1) {
    const err = new Error('Quantity must be an integer of at least 1');
    err.statusCode = 400;
    throw err;
  }
  if (qty > 10000) {
    const err = new Error('Quantity exceeds maximum allowed limit (10000)');
    err.statusCode = 400;
    throw err;
  }
  return qty;
};

const matchesItem = (item, productId, size) => {
  if (!item || !item.product) return false;
  const id = item.product._id ? item.product._id.toString() : item.product.toString();
  const sameId = id === productId.toString();
  if (!size) return sameId;
  return sameId && (item.size || 'M') === String(size).trim();
};

// Ajouter un produit au panier
export const addToCart = async (userId, productId, quantity = 1, size = 'M', productName = '') => {
  validateUserId(userId);

  validateProductId(productId);
  const targetId = productId;

  const qty = validateQuantity(quantity);
  const cleanSize = String(size || 'M').trim();

  const product = await Product.findById(targetId);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
  }

  const existingItemIndex = cart.items.findIndex((item) =>
    matchesItem(item, targetId, cleanSize)
  );

  if (existingItemIndex > -1) {
    cart.items[existingItemIndex].quantity += qty;
  } else {
    cart.items.push({ product: targetId, quantity: qty, size: cleanSize });
  }

  await cart.save();
  return await cart.populate('items.product');
};

// Récupérer le panier de l'utilisateur
export const getCart = async (userId) => {
  validateUserId(userId);

  let cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
    await cart.populate('items.product');
  }

  // Filter out any items whose product was deleted from MongoDB
  if (cart.items.some((item) => !item.product)) {
    cart.items = cart.items.filter((item) => item.product != null);
    await cart.save();
  }

  return cart;
};

// Mettre à jour la quantité d'un produit dans le panier
export const updateCartItem = async (userId, productId, quantity, size = null) => {
  validateUserId(userId);
  validateProductId(productId);

  const qty = validateQuantity(quantity);

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    const err = new Error('Cart not found');
    err.statusCode = 404;
    throw err;
  }

  const itemIndex = cart.items.findIndex((item) =>
    matchesItem(item, productId, size)
  );

  if (itemIndex === -1) {
    const err = new Error('Product not found in cart');
    err.statusCode = 404;
    throw err;
  }

  cart.items[itemIndex].quantity = qty;
  await cart.save();
  return await cart.populate('items.product');
};

// Supprimer un produit du panier
export const removeFromCart = async (userId, productId, size = null) => {
  validateUserId(userId);
  validateProductId(productId);

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    const err = new Error('Cart not found');
    err.statusCode = 404;
    throw err;
  }

  const itemIndex = cart.items.findIndex((item) =>
    matchesItem(item, productId, size)
  );

  if (itemIndex === -1) {
    const err = new Error('Product not found in cart');
    err.statusCode = 404;
    throw err;
  }

  cart.items.splice(itemIndex, 1);
  await cart.save();
  return await cart.populate('items.product');
};

// Vider entièrement le panier
export const clearCart = async (userId) => {
  validateUserId(userId);
  const cart = await Cart.findOneAndUpdate(
    { user: userId },
    { items: [] },
    { new: true, upsert: true }
  );
  return cart;
};

export default {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};
