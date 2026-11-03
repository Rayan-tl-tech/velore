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
      color: it.color || null,
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
      const color = rawItem.color ? String(rawItem.color).trim() : null;

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
        name: existingProduct.name,
        image: existingProduct.image || '',
        quantity: qty,
        price: authoritativePrice,
        size,
        color,
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

// Graph of authorized status transitions for the order lifecycle
export const ALLOWED_TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: ['pending', 'processing'],
};

// Update order status with strict state machine, atomic stock management and idempotent cancellation
export const updateOrderStatus = async (orderId, status) => {
  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    const err = new Error('Invalid order ID');
    err.statusCode = 400;
    throw err;
  }

  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'];
  const normalizedStatus = status?.toLowerCase()?.trim();
  if (!normalizedStatus || !validStatuses.includes(normalizedStatus)) {
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

  // Idempotence: repeated request for the exact same status produces no transition and no stock modification.
  // Condition checks that the order has remained in normalizedStatus and was not concurrently modified.
  if (currentOrder.status === normalizedStatus) {
    const verifiedOrder = await Order.findOne({
      _id: orderId,
      status: normalizedStatus,
    })
      .populate('user', 'name email')
      .populate('items.product');

    if (!verifiedOrder) {
      const latestOrder = await Order.findById(orderId);
      if (!latestOrder) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
      }
      const err = new Error(
        `Order status was modified concurrently to '${latestOrder.status}'. Repeated status request for '${normalizedStatus}' aborted.`
      );
      err.statusCode = 409;
      throw err;
    }

    return verifiedOrder;
  }

  // Validate that transition is permitted by the state machine
  const allowed = ALLOWED_TRANSITIONS[currentOrder.status] || [];
  if (!allowed.includes(normalizedStatus)) {
    const err = new Error(
      `Invalid status transition from '${currentOrder.status}' to '${normalizedStatus}'. Allowed transitions: [${allowed.join(', ')}]`
    );
    err.statusCode = 400;
    throw err;
  }

  // ─── Case 1: Transition to CANCELLED (Atomic & Idempotent) ───
  // Allowed only from 'pending' or 'processing' as validated by ALLOWED_TRANSITIONS above
  if (normalizedStatus === 'cancelled') {
    // Atomically transition to 'cancelled' ONLY IF the order is still in an allowed cancellable state.
    // This atomic check-and-set prevents concurrent cancellation requests from restocking multiple times.
    const previousOrder = await Order.findOneAndUpdate(
      { _id: orderId, status: { $in: ['pending', 'processing'] } },
      { $set: { status: 'cancelled' } },
      { returnDocument: 'before' }
    );

    if (previousOrder) {
      // Exclusively won the cancellation race: restore inventory for all valid items
      for (const item of previousOrder.items) {
        const pId = item.product?._id || item.product;
        if (pId) {
          await Product.findByIdAndUpdate(pId, {
            $inc: { stock: item.quantity },
          }).catch((err) => {
            console.error(`Failed to restore stock for product ${pId}:`, err);
          });
        }
      }
    } else {
      // Either order does not exist, was concurrently cancelled, or concurrently changed status
      const existingOrder = await Order.findById(orderId);
      if (!existingOrder) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
      }
      if (existingOrder.status === 'cancelled') {
        // Idempotent cancellation: order was already cancelled, stock was already restored once
        return await Order.findById(orderId)
          .populate('user', 'name email')
          .populate('items.product');
      }
      // If order exists but has another status (e.g. was concurrently moved to 'shipped' or 'delivered'):
      const err = new Error(
        `Order status was modified concurrently to '${existingOrder.status}'. Cancellation aborted.`
      );
      err.statusCode = 409;
      throw err;
    }

    return await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('items.product');
  }

  // ─── Case 2: Transition from CANCELLED (Reactivation to 'pending' or 'processing') ───
  // Allowed only from 'cancelled' to 'pending' or 'processing' as validated by ALLOWED_TRANSITIONS
  if (currentOrder.status === 'cancelled') {
    const decrementedItems = [];
    try {
      for (const item of currentOrder.items) {
        const pId = item.product?._id || item.product;
        const qty = item.quantity;
        if (!pId) continue;

        // Atomic conditional decrement: only succeeds if current stock >= required quantity
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: pId, stock: { $gte: qty } },
          { $inc: { stock: -qty } },
          { returnDocument: 'after' }
        );

        if (!updatedProduct) {
          const existingProduct = await Product.findById(pId);
          const prodName = existingProduct ? `"${existingProduct.name}"` : `ID ${pId}`;
          const availableStock = existingProduct ? existingProduct.stock : 0;
          const err = new Error(
            `Cannot reactivate order: insufficient stock for product ${prodName}. Required: ${qty}, available: ${availableStock}.`
          );
          err.statusCode = 400;
          throw err;
        }

        decrementedItems.push({ productId: pId, quantity: qty });
      }

      // Atomically update order status from 'cancelled' to normalizedStatus ('pending' or 'processing')
      const reactivatedOrder = await Order.findOneAndUpdate(
        { _id: orderId, status: 'cancelled' },
        { $set: { status: normalizedStatus } },
        { returnDocument: 'after' }
      );

      if (!reactivatedOrder) {
        // Order status changed concurrently while decrementing stock.
        // Throw 409; the centralized catch block below performs the single rollback compensation.
        const err = new Error('Order status was modified concurrently. Reactivation aborted.');
        err.statusCode = 409;
        throw err;
      }
    } catch (error) {
      // Centralized rollback compensation: restore each decremented item exactly once
      // (Note: To be replaced by a native MongoDB multi-document transaction in a subsequent phase)
      for (const { productId, quantity } of decrementedItems) {
        await Product.findByIdAndUpdate(productId, {
          $inc: { stock: quantity },
        }).catch((rollbackErr) => {
          console.error(`Failed to rollback stock for product ${productId}:`, rollbackErr);
        });
      }
      throw error;
    }

    return await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('items.product');
  }

  // ─── Case 3: Standard Forward Transitions (Atomic Conditional Update) ───
  // (e.g. pending -> processing, processing -> shipped, shipped -> delivered, delivered -> completed)
  // Atomically transition from currentOrder.status to normalizedStatus.
  // Condition checks both _id and expected current status to prevent concurrent status overwrites.
  const updatedOrder = await Order.findOneAndUpdate(
    { _id: orderId, status: currentOrder.status },
    { $set: { status: normalizedStatus } },
    { returnDocument: 'after' }
  );

  if (!updatedOrder) {
    const err = new Error(
      `Order status was modified concurrently. Cannot transition from '${currentOrder.status}' to '${normalizedStatus}'.`
    );
    err.statusCode = 409;
    throw err;
  }

  return await Order.findById(orderId)
    .populate('user', 'name email')
    .populate('items.product');
};

// Delete order (Admin only - protected against active order stock loss with atomic conditional deletion)
export const deleteOrder = async (orderId) => {
  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    const err = new Error('Invalid order ID');
    err.statusCode = 400;
    throw err;
  }

  // Deletion is permitted exclusively for non-active states: 'cancelled', 'delivered', or 'completed'.
  // Atomic conditional deletion ensures that no concurrent state transition (e.g. reactivation to 'processing')
  // can interleave between check and deletion, preventing permanent inventory leakage.
  const deletableStatuses = ['cancelled', 'delivered', 'completed'];
  const order = await Order.findOneAndDelete({
    _id: orderId,
    status: { $in: deletableStatuses },
  });

  if (!order) {
    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    const activeStatuses = ['pending', 'processing', 'shipped'];
    if (activeStatuses.includes(existingOrder.status)) {
      const err = new Error(
        `Cannot delete active order with status '${existingOrder.status}'. The order must be cancelled first to ensure proper inventory restoration.`
      );
      err.statusCode = 400;
      throw err;
    }

    const err = new Error(`Cannot delete order with status '${existingOrder.status}'.`);
    err.statusCode = 400;
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
  ALLOWED_TRANSITIONS,
};
