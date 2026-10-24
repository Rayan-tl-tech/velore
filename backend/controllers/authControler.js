import authService from '../services/authService.js';
import { getRefreshCookieOptions, clearRefreshCookie } from '../services/tokenService.js';

/**
 * POST /api/auth/register
 */
const registerUser = async (req, res) => {
  try {
    const result = await authService.registerUser(req.body, req);

    // Set secure HttpOnly cookie for refresh token
    res.cookie('refreshToken', result.rawRefreshToken, getRefreshCookieOptions());

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: result.user,
      accessToken: result.accessToken,
      token: result.accessToken, // Backward compatibility
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ error: error.message, success: false });
  }
};

/**
 * POST /api/auth/login
 */
const loginUser = async (req, res) => {
  try {
    const result = await authService.loginUser(req.body, req);

    // Set secure HttpOnly cookie for refresh token
    res.cookie('refreshToken', result.rawRefreshToken, getRefreshCookieOptions());

    res.status(200).json({
      success: true,
      message: 'User logged in successfully',
      user: result.user,
      accessToken: result.accessToken,
      token: result.accessToken, // Backward compatibility
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ error: error.message, success: false });
  }
};

/**
 * POST /api/auth/refresh
 * Validates HttpOnly refresh cookie, rotates token, sets new cookie, and returns new access token.
 */
const refreshSession = async (req, res) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;
    if (!rawRefreshToken) {
      clearRefreshCookie(res);
      return res.status(401).json({
        error: 'No refresh token provided',
        success: false,
      });
    }

    const result = await authService.refreshUserSession(rawRefreshToken, req);

    // Set rotated HttpOnly refresh token cookie
    res.cookie('refreshToken', result.newRawRefreshToken, getRefreshCookieOptions());

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: result.accessToken,
      token: result.accessToken, // Backward compatibility
      user: result.user,
    });
  } catch (error) {
    // If refresh failed or reuse was detected, always clear the invalid cookie
    clearRefreshCookie(res);
    const statusCode = error.statusCode || 401;
    res.status(statusCode).json({
      error: error.message || 'Session expired or invalid',
      success: false,
    });
  }
};

/**
 * POST /api/auth/logout
 * Revokes current session in MongoDB and clears HttpOnly refresh cookie.
 */
const logoutUser = async (req, res) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;
    if (rawRefreshToken) {
      await authService.logoutUserSession(rawRefreshToken);
    }
    clearRefreshCookie(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    clearRefreshCookie(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }
};

/**
 * POST /api/auth/logout-all
 * Revokes all sessions for authenticated user and clears HttpOnly refresh cookie.
 */
const logoutAllSessions = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (userId) {
      await authService.logoutAllUserSessions(userId);
    }
    clearRefreshCookie(res);
    res.status(200).json({
      success: true,
      message: 'All active sessions have been revoked successfully',
    });
  } catch (error) {
    clearRefreshCookie(res);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message, success: false });
  }
};

/**
 * POST /api/auth/forgot-password (Phase 4.2)
 */
const forgotPasswordController = async (req, res) => {
  try {
    const { email } = req.body || {};
    const result = await authService.forgotPassword(email);
    res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ error: error.message, success: false });
  }
};

/**
 * POST /api/auth/reset-password (Phase 4.2)
 */
const resetPasswordController = async (req, res) => {
  try {
    const { token, password } = req.body || {};
    const result = await authService.resetPassword(token, password);
    res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ error: error.message, success: false });
  }
};

export {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  logoutAllSessions,
  forgotPasswordController,
  resetPasswordController,
};

export default {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  logoutAllSessions,
  forgotPasswordController,
  resetPasswordController,
};
