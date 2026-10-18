import {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
} from '../services/orderService.js';

// Créer une commande (Guest ou Utilisateur Authentifié)
export const createOrderController = async (req, res, next) => {
  try {
    const authenticatedUser = req.user || null;
    const order = await createOrder(req.body, authenticatedUser);
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order,
    });
  } catch (error) {
    next(error);
  }
};

// Récupérer les commandes de l'utilisateur connecté
export const getMyOrdersController = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required', success: false });
    }
    const orders = await getMyOrders(req.user._id);
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

// Récupérer toutes les commandes (admin)
export const getAllOrdersController = async (_req, res, next) => {
  try {
    const orders = await getAllOrders();
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

// Récupérer une commande par son identifiant
export const getOrderByIdController = async (req, res, next) => {
  try {
    const guestToken = req.query.token || req.headers['x-guest-token'];
    const order = await getOrderById(req.params.id, req.user, guestToken);
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

// Mettre à jour le statut d'une commande (admin)
export const updateOrderStatusController = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required', success: false });
    }
    const order = await updateOrderStatus(req.params.id, status);
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

// Supprimer une commande (admin)
export const deleteOrderController = async (req, res, next) => {
  try {
    const result = await deleteOrder(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export default {
  createOrderController,
  getMyOrdersController,
  getAllOrdersController,
  getOrderByIdController,
  updateOrderStatusController,
  deleteOrderController,
};
