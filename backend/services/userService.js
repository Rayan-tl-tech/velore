import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';

const getProfile = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

const updateProfile = async (userId, updateData) => {
  const allowedUpdates = {};
  if (updateData.name !== undefined) {
    const trimmedName = String(updateData.name).trim();
    if (!trimmedName) throw new Error('Name cannot be empty');
    allowedUpdates.name = trimmedName;
  }
  if (updateData.email !== undefined) {
    const trimmedEmail = String(updateData.email).trim().toLowerCase();
    if (!trimmedEmail) throw new Error('Email cannot be empty');
    const existing = await User.findOne({ email: trimmedEmail, _id: { $ne: userId } });
    if (existing) {
      throw new Error('User with this email already exists');
    }
    allowedUpdates.email = trimmedEmail;
  }
  if (updateData.phone !== undefined) {
    allowedUpdates.phone = String(updateData.phone).trim();
  }
  if (updateData.wilaya !== undefined) {
    allowedUpdates.wilaya = String(updateData.wilaya).trim();
  }
  if (updateData.commune !== undefined) {
    allowedUpdates.commune = String(updateData.commune).trim();
  }
  if (updateData.address !== undefined) {
    allowedUpdates.address = String(updateData.address).trim();
  }

  const user = await User.findByIdAndUpdate(userId, allowedUpdates, { returnDocument: 'after', runValidators: true }).select('-password');
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

/**
 * Fetch all users with optional search term (admin only)
 * Sanitizes regex and excludes password hashes
 */
const getAllUsers = async (searchTerm = '') => {
  const query = {};
  if (searchTerm && typeof searchTerm === 'string') {
    const cleanSearch = searchTerm.trim();
    if (cleanSearch) {
      const escaped = cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }
  }
  return await User.find(query).select('-password').sort({ createdAt: -1 });
};

/**
 * Fetch single user by ID (admin only)
 */
const getUserById = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error('Invalid user ID format');
    err.statusCode = 400;
    throw err;
  }
  const user = await User.findById(userId).select('-password');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user;
};

/**
 * Update user role (promote to admin or demote to user)
 * Enforces:
 * 1. Self-lockout prevention (cannot remove admin from self)
 * 2. Last administrator protection (cannot remove admin if only 1 admin remains)
 * 3. Atomic MongoDB array operations ($addToSet / $pull)
 * 4. Password and other fields cannot be modified through this endpoint
 */
const updateUserRole = async (targetUserId, actionInput, requestingAdminId) => {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    const err = new Error('Invalid user ID format');
    err.statusCode = 400;
    throw err;
  }

  const normalizedAction = String(actionInput || '').trim().toLowerCase();
  const isPromote = normalizedAction === 'promote' || normalizedAction === 'admin';
  const isDemote = normalizedAction === 'demote' || normalizedAction === 'user';

  if (!isPromote && !isDemote) {
    const err = new Error('Invalid role action. Must be promote (admin) or demote (user).');
    err.statusCode = 400;
    throw err;
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (isDemote) {
    // Rule: Prevent accidental self-lockout
    if (targetUserId.toString() === requestingAdminId.toString()) {
      const err = new Error('You cannot remove administrator privileges from your own account.');
      err.statusCode = 400;
      throw err;
    }

    // Rule: Protect the last administrator
    if (targetUser.roles.includes('admin')) {
      const adminCount = await User.countDocuments({ roles: 'admin' });
      if (adminCount <= 1) {
        const err = new Error('Cannot remove the last administrator.');
        err.statusCode = 400;
        throw err;
      }
    }

    // Atomically remove 'admin' role
    const updatedUser = await User.findByIdAndUpdate(
      targetUserId,
      {
        $pull: { roles: 'admin' },
      },
      { returnDocument: 'after' }
    ).select('-password');

    // Ensure roles array contains at least 'user' if it became empty
    if (!updatedUser.roles || updatedUser.roles.length === 0) {
      await User.findByIdAndUpdate(targetUserId, { $addToSet: { roles: 'user' } });
      updatedUser.roles = ['user'];
    }

    return updatedUser;
  }


  if (isPromote) {
    // Atomically add 'admin' role
    const updatedUser = await User.findByIdAndUpdate(
      targetUserId,
      {
        $addToSet: { roles: 'admin' },
      },
      { returnDocument: 'after' }
    ).select('-password');

    return updatedUser;
  }
};

/**
 * Delete a user account (admin only)
 * Enforces:
 * 1. Admin cannot delete their own account
 * 2. Cannot delete the last administrator
 */
const deleteUser = async (targetUserId, requestingAdminId) => {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    const err = new Error('Invalid user ID format');
    err.statusCode = 400;
    throw err;
  }

  if (targetUserId.toString() === requestingAdminId.toString()) {
    const err = new Error('You cannot delete your own account.');
    err.statusCode = 400;
    throw err;
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (targetUser.roles.includes('admin')) {
    const adminCount = await User.countDocuments({ roles: 'admin' });
    if (adminCount <= 1) {
      const err = new Error('Cannot delete the last administrator.');
      err.statusCode = 400;
      throw err;
    }
  }

  await User.findByIdAndDelete(targetUserId);
  return { success: true, message: 'User deleted successfully' };
};

/**
 * Fetch authenticated user's favorite products.
 * Populates product details and nested category.
 * Filters out deleted products and cleans up orphaned IDs.
 */
const getFavorites = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error('Invalid user ID format');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(userId)
    .populate({
      path: 'favorites',
      populate: { path: 'category' }
    })
    .select('favorites');

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const validFavorites = (user.favorites || []).filter(item => item != null && item._id);

  if (user.favorites && user.favorites.length !== validFavorites.length) {
    const cleanIds = validFavorites.map(item => item._id);
    await User.findByIdAndUpdate(userId, { favorites: cleanIds });
  }

  return validFavorites;
};

/**
 * Add a product to authenticated user's favorites.
 * Validates productId and existence of product in MongoDB.
 * Uses atomic $addToSet to prevent duplicates.
 */
const addFavorite = async (userId, productId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error('Invalid user ID format');
    err.statusCode = 400;
    throw err;
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    const err = new Error('Invalid product ID format');
    err.statusCode = 400;
    throw err;
  }

  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $addToSet: { favorites: productId } },
    { returnDocument: 'after' }
  ).populate({
    path: 'favorites',
    populate: { path: 'category' }
  }).select('favorites');

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  return (user.favorites || []).filter(item => item != null && item._id);
};

/**
 * Remove a product from authenticated user's favorites.
 * Uses atomic $pull.
 */
const removeFavorite = async (userId, productId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error('Invalid user ID format');
    err.statusCode = 400;
    throw err;
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    const err = new Error('Invalid product ID format');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $pull: { favorites: productId } },
    { returnDocument: 'after' }
  ).populate({
    path: 'favorites',
    populate: { path: 'category' }
  }).select('favorites');

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  return (user.favorites || []).filter(item => item != null && item._id);
};

export {
  getProfile,
  updateProfile,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getFavorites,
  addFavorite,
  removeFavorite,
};

