import {
  getProfile,
  updateProfile,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getFavorites,
  addFavorite,
  removeFavorite,
} from '../services/userService.js';

const getProfileController = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await getProfile(userId);
    res.status(200).json(user);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const updateProfileController = async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;
    const updatedUser = await updateProfile(userId, updateData);
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * GET /api/users
 * Admin only: Fetch all users with optional search query
 */
const getAllUsersController = async (req, res) => {
  try {
    const { search } = req.query;
    const users = await getAllUsers(search);
    res.status(200).json(users);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message, success: false });
  }
};

/**
 * GET /api/users/:id
 * Admin only: Fetch single user by ID
 */
const getUserByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserById(id);
    res.status(200).json(user);
  } catch (error) {
    const statusCode = error.statusCode || (error.message === 'User not found' ? 404 : 400);
    res.status(statusCode).json({ error: error.message, success: false });
  }
};

/**
 * PUT /api/users/:id/roles
 * Admin only: Update user role (promote to admin or demote to user)
 */
const updateUserRoleController = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const action = req.body.action || req.body.role;
    const requestingAdminId = req.user._id;

    const updatedUser = await updateUserRole(targetUserId, action, requestingAdminId);
    res.status(200).json({
      success: true,
      message: `User roles updated successfully`,
      user: updatedUser,
    });
  } catch (error) {
    const statusCode = error.statusCode || (error.message === 'User not found' ? 404 : 400);
    res.status(statusCode).json({ error: error.message, success: false });
  }
};

/**
 * DELETE /api/users/:id
 * Admin only: Delete user account
 */
const deleteUserController = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const requestingAdminId = req.user._id;

    const result = await deleteUser(targetUserId, requestingAdminId);
    res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || (error.message === 'User not found' ? 404 : 400);
    res.status(statusCode).json({ error: error.message, success: false });
  }
};

/**
 * GET /api/users/favorites
 * Fetch all favorite products of authenticated user
 */
const getFavoritesController = async (req, res) => {
  try {
    const userId = req.user._id;
    const favorites = await getFavorites(userId);
    res.status(200).json(favorites);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message, success: false });
  }
};

/**
 * POST /api/users/favorites/:productId
 * Add a product to authenticated user's favorites
 */
const addFavoriteController = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;
    const favorites = await addFavorite(userId, productId);
    res.status(200).json({
      success: true,
      message: 'Product added to favorites',
      favorites,
    });
  } catch (error) {
    const statusCode = error.statusCode || (error.message === 'Product not found' ? 404 : 400);
    res.status(statusCode).json({ error: error.message, success: false });
  }
};

/**
 * DELETE /api/users/favorites/:productId
 * Remove a product from authenticated user's favorites
 */
const removeFavoriteController = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;
    const favorites = await removeFavorite(userId, productId);
    res.status(200).json({
      success: true,
      message: 'Product removed from favorites',
      favorites,
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ error: error.message, success: false });
  }
};

export {
  getProfileController,
  updateProfileController,
  getAllUsersController,
  getUserByIdController,
  updateUserRoleController,
  deleteUserController,
  getFavoritesController,
  addFavoriteController,
  removeFavoriteController,
};


