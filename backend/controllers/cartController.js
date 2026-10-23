import {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../services/cartService.js';

// Ajouter un produit au panier
export const addToCartController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId, quantity, size = 'M', productName } = req.body;
    const cart = await addToCart(userId, productId, quantity, size, productName);
    res.status(200).json(cart);
  } catch (error) {
    next(error);
  }
};

// Obtenir le panier de l'utilisateur
export const getCartController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const cart = await getCart(userId);
    res.status(200).json(cart);
  } catch (error) {
    next(error);
  }
};

// Mettre à jour la quantité d'un produit
export const updateCartItemController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;
    const { quantity, size } = req.body;
    const cart = await updateCartItem(userId, productId, quantity, size);
    res.status(200).json(cart);
  } catch (error) {
    next(error);
  }
};

// Supprimer un produit du panier
export const removeFromCartController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;
    const size = req.query.size || req.body?.size;
    const cart = await removeFromCart(userId, productId, size);
    res.status(200).json({ message: 'Product removed from cart', cart });
  } catch (error) {
    next(error);
  }
};

// Vider le panier
export const clearCartController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const cart = await clearCart(userId);
    res.status(200).json({ message: 'Cart cleared successfully', cart });
  } catch (error) {
    next(error);
  }
};

export default {
  addToCartController,
  getCartController,
  updateCartItemController,
  removeFromCartController,
  clearCartController,
};
