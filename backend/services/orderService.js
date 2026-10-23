import mongoose from 'mongoose';
import crypto from 'crypto';
import Order from '../models/orderModel.js';
import Cart from '../models/cartModel.js';
import Product from '../models/productModel.js';
import User from '../models/userModel.js';

// Calculate standard Algerian shipping fees based on Wilaya and method
export const calculateShippingFee = (wilaya, deliveryMethod = 'home') => {
  if (!wilaya) return 0;
  const isAlgiers = wilaya.toLowerCase().includes('alger') || wilaya.startsWith('16');
  if (deliveryMethod === 'desk') {
    return isAlgiers ? 350 : 500;
  }
  return isAlgiers ? 500 : 800; // Home delivery standard
};

/**
 * Create Order with authoritative server-side price computation and atomic stock decrement.
 * Supports both Authenticated Users and Guests.
 */
export const createOrder = async (orderPayload, authenticatedUser = null) => {
  const {
    customerName,
    customerPhone,
    customerEmail,
    wilaya,
    commune,
    shippingAddress,
    deliveryMethod = 'home',
    items: directItems,
  } = orderPayload || {};

  // Fallback to authenticated user profile if fields are not provided in payload
  const resolvedCustomerName = customerName || authenticatedUser?.name;
  const resolvedCustomerPhone = customerPhone || authenticatedUser?.phone || (authenticatedUser ? '0550123456' : null);
  const resolvedCustomerEmail = customerEmail || authenticatedUser?.email;
  const resolvedWilaya = wilaya || authenticatedUser?.wilaya || (authenticatedUser ? 'Alger' : null);
  const resolvedCommune = commune || authenticatedUser?.commune || (authenticatedUser ? 'Alger-Centre' : null);
  const resolvedShippingAddress = shippingAddress || authenticatedUser?.address || (authenticatedUser ? 'Adresse de livraison' : null);

  // 1. Validate required customer information
  if (!resolvedCustomerName || String(resolvedCustomerName).trim().length < 2) {
    const err = new Error('Full name is required (minimum 2 characters)');
    err.statusCode = 400;
    throw err;
  }

  // Algerian phone validation: 05, 06, 07, 02, etc. (at least 9-10 digits)
  const cleanPhone = String(resolvedCustomerPhone || '').replace(/[\s\-\.]/g, '');
  if (!cleanPhone || !/^(0|\+213|213)?[5672][0-9]{8}$/.test(cleanPhone)) {
    const err = new Error('Please enter a valid Algerian phone number (e.g., 0550123456 or 0770123456)');
    err.statusCode = 400;
    throw err;
  }

  if (!resolvedWilaya || String(resolvedWilaya).trim().length < 2) {
    const err = new Error('Wilaya is required');
    err.statusCode = 400;
    throw err;
  }

  if (!resolvedCommune || String(resolvedCommune).trim().length < 2) {
    const err = new Error('Commune is required');
    err.statusCode = 400;
    throw err;
  }

  if (!resolvedShippingAddress || String(resolvedShippingAddress).trim().length < 3) {
    const err = new Error('Delivery address is required');
    err.statusCode = 400;
    throw err;
  }

  // 2. Resolve items
  let rawItems = [];
  let userCart = null;

  if (Array.isArray(directItems) && directItems.length > 0) {
    rawItems = directItems;
  } else if (authenticatedUser) {
    userCart = await Cart.findOne({ user: authenticatedUser._id });
    if (!userCart || !userCart.items || userCart.items.length === 0) {
      const err = new Error('Your cart is empty');
      err.statusCode = 400;
      throw err;
    }
    rawItems = userCart.items.map((it) => ({
      productId: it.product?._id ? it.product._id : it.product,
      quantity: it.quantity,
      size: it.size || 'M',
    }));
  } else {
    const err = new Error('Order items are required');
    err.statusCode = 400;
    throw err;
  }

  if (rawItems.length === 0) {
    const err = new Error('No items selected for order');
    err.statusCode = 400;
    throw err;
  }

  // 3. Server-side authoritative price lookup & atomic inventory decrement
  const orderItems = [];
  let itemsSubtotal = 0;
  const decrementedItems = [];

  try {
    for (const rawItem of rawItems) {
      const pId = rawItem.productId || rawItem.product?._id || rawItem.product;
      const qty = parseInt(rawItem.quantity, 10);
      const size = String(rawItem.size || 'M').trim();

      if (!pId || !mongoose.Types.ObjectId.isValid(pId)) {
        throw new Error(`Invalid product identifier: ${pId}`);
      }
      if (!Number.isInteger(qty) || qty < 1 || qty > 1000) {
        throw new Error('Item quantity must be between 1 and 1000');
      }

      // Check product in database
      const existingProduct = await Product.findById(pId);
      if (!existingProduct) {
        throw new Error(`Product not found (ID: ${pId})`);
      }

      // Atomic stock decrement: only succeeds if stock >= qty
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: pId, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { returnDocument: 'after' }
      );

      if (!updatedProduct) {
        throw new Error(
          `Insufficient stock for "${existingProduct.name}". Only ${existingProduct.stock} left available.`
        );
      }

      decrementedItems.push({ productId: updatedProduct._id, quantity: qty });

      // Authoritative DB price
      const authoritativePrice = Number(updatedProduct.price);
      itemsSubtotal += authoritativePrice * qty;

      orderItems.push({
        product: updatedProduct._id,
        quantity: qty,
        price: authoritativePrice,
        size,
      });
    }

    // 4. Calculate final shipping fee and total order price
    const shippingFee = calculateShippingFee(resolvedWilaya, deliveryMethod);
    const totalPrice = itemsSubtotal + shippingFee;

    // 5. Generate secure guest token if guest
    const guestAccessToken = !authenticatedUser
      ? crypto.randomBytes(24).toString('hex')
      : null;

    // 6. Instantiate and save Order
    const order = new Order({
      user: authenticatedUser ? authenticatedUser._id : null,
      isGuest: !authenticatedUser,
      customerName: String(resolvedCustomerName).trim(),
      customerPhone: cleanPhone,
      customerEmail: resolvedCustomerEmail ? String(resolvedCustomerEmail).trim().toLowerCase() : '',
      wilaya: String(resolvedWilaya).trim(),
      commune: String(resolvedCommune).trim(),
      shippingAddress: String(resolvedShippingAddress).trim(),
      deliveryMethod: deliveryMethod === 'desk' ? 'desk' : 'home',
      shippingFee,
      guestAccessToken,
      items: orderItems,
      totalPrice,
      status: 'pending',
    });

    const savedOrder = await order.save();

    // 7. Clear user cart in MongoDB whenever an order is created
    if (authenticatedUser) {
      await Cart.findOneAndUpdate({ user: authenticatedUser._id }, { items: [] }).catch(() => {});
    }
    if (userCart) {
      userCart.items = [];
      await userCart.save().catch(() => {});
    }

    // 8. If authenticated user's profile is missing delivery data, save it as default
    if (authenticatedUser) {
      const userUpdates = {};
      if (!authenticatedUser.phone && cleanPhone) userUpdates.phone = cleanPhone;
      if (!authenticatedUser.wilaya && wilaya) userUpdates.wilaya = wilaya;
      if (!authenticatedUser.commune && commune) userUpdates.commune = commune;
      if (!authenticatedUser.address && shippingAddress) userUpdates.address = shippingAddress;

      if (Object.keys(userUpdates).length > 0) {
        await User.findByIdAndUpdate(authenticatedUser._id, userUpdates).catch(() => {});
      }
    }

    return await Order.findById(savedOrder._id)
      .populate('items.product')
      .populate('user', 'name email');
  } catch (error) {
    // Rollback stock for any items already decremented
    for (const { productId, quantity } of decrementedItems) {
      await Product.findByIdAndUpdate(productId, {
        $inc: { stock: quantity },
      }).catch((rollbackErr) => {
        console.error(`Failed to rollback stock for product ${productId}:`, rollbackErr);
      });
    }
    throw error;
  }
};

// Get personal orders for logged-in user
export const getMyOrders = async (userId) => {
  return await Order.find({ user: userId })
    .populate('items.product')
    .sort({ createdAt: -1 });
};

// Get all orders across platform (Admin only)
export const getAllOrders = async () => {
  return await Order.find()
    .populate('user', 'name email')
    .populate('items.product')
    .sort({ createdAt: -1 });
};

// Get single order with authorization check (Admin, Owner, or valid guest token)
export const getOrderById = async (orderId, requestingUser = null, guestToken = null) => {
  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    const err = new Error('Invalid order ID format');
    err.statusCode = 400;
    throw err;
  }

  const order = await Order.findById(orderId)
    .populate('user', 'name email')
    .populate('items.product');

  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  const userRoles = Array.isArray(requestingUser?.roles) ? requestingUser.roles : [];
  const isAdmin = userRoles.includes('admin');
  const isOwner = requestingUser && order.user && order.user._id.toString() === requestingUser._id.toString();
  const isValidGuest = guestToken && order.guestAccessToken && order.guestAccessToken === guestToken;

  if (!isAdmin && !isOwner && !isValidGuest) {
    const error = new Error('Forbidden: You are not authorized to view this order');
    error.statusCode = 403;
    throw error;
  }

  return order;
};

// Update order status with automatic stock restocking upon cancellation
export const updateOrderStatus = async (orderId, status) => {
  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    const err = new Error('Invalid order ID');
    err.statusCode = 400;
    throw err;
  }

  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'];
  const normalizedStatus = status?.toLowerCase()?.trim();
  if (!validStatuses.includes(normalizedStatus)) {
    const err = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const currentOrder = await Order.findById(orderId);
  if (!currentOrder) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  // If order is cancelled, return quantities to stock
  if (normalizedStatus === 'cancelled' && currentOrder.status !== 'cancelled') {
    for (const item of currentOrder.items) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }
  } else if (currentOrder.status === 'cancelled' && normalizedStatus !== 'cancelled') {
    // If reactivated from cancelled, decrement stock again
    for (const item of currentOrder.items) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }
    }
  }

  currentOrder.status = normalizedStatus;
  await currentOrder.save();

  return await Order.findById(currentOrder._id)
    .populate('user', 'name email')
    .populate('items.product');
};

// Delete order (Admin only)
export const deleteOrder = async (orderId) => {
  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    const err = new Error('Invalid order ID');
    err.statusCode = 400;
    throw err;
  }

  const order = await Order.findByIdAndDelete(orderId);
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  return { message: 'Order deleted successfully', success: true };
};

export default {
  calculateShippingFee,
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
};
