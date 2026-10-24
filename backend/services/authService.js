import crypto from 'crypto';
import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import {
  generateAccessToken,
  createSession,
  rotateSession,
  revokeSession,
  revokeAllUserSessions,
} from './tokenService.js';

dotenv.config();

const sanitizeUser = (userDoc) => {
  const userObj = userDoc?.toObject ? userDoc.toObject() : { ...userDoc };
  delete userObj.password;
  return userObj;
};

// Strict email regex (RFC 5322 standard-compliant simplified format)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Common trivial passwords to reject on registration
const COMMON_WEAK_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  'admin123',
  'qwerty123',
  'letmein123',
  'shopify123',
]);

/**
 * Register a new user and create an initial session
 */
const registerUser = async (userData, req = null) => {
  if (!userData || typeof userData !== 'object') {
    throw new Error('Invalid request payload');
  }
  const { name, email, password } = userData;
  if (!name || !email || !password) {
    throw new Error('Name, email, and password are required');
  }
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    throw new Error('Name, email, and password must be valid strings');
  }

  const trimmedName = String(name).trim();
  if (trimmedName.length < 2) {
    throw new Error('Name must be at least 2 characters long');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new Error('Please provide a valid email address');
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Strengthened password policy for NEW registrations (SEC-09: minimum 6 characters)
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    throw new Error('Password must contain at least one letter and one number');
  }

  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
    throw new Error('Password is too common. Please choose a stronger password');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name: trimmedName,
    email: normalizedEmail,
    password: hashedPassword,
  });

  // Short-lived access token + persistent refresh session
  const accessToken = generateAccessToken(user);
  const { rawRefreshToken } = await createSession(user._id, req);

  return {
    user: sanitizeUser(user),
    accessToken,
    rawRefreshToken,
  };
};

/**
 * Authenticate user and create a new session
 */
const loginUser = async (userData, req = null) => {
  if (!userData || typeof userData !== 'object') {
    throw new Error('Invalid email or password');
  }
  const { email, password } = userData;
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new Error('Invalid email or password');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    // SEC-08: Prevent user enumeration
    throw new Error('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    // SEC-08: Prevent user enumeration
    throw new Error('Invalid email or password');
  }

  // Short-lived access token + persistent refresh session
  const accessToken = generateAccessToken(user);
  const { rawRefreshToken } = await createSession(user._id, req);

  return {
    user: sanitizeUser(user),
    accessToken,
    rawRefreshToken,
  };
};

/**
 * Refresh an access token via rotating refresh token
 */
const refreshUserSession = async (rawRefreshToken, req = null) => {
  return await rotateSession(rawRefreshToken, req);
};

/**
 * Revoke a single session by refresh token (used on logout)
 */
const logoutUserSession = async (rawRefreshToken) => {
  return await revokeSession(rawRefreshToken);
};

/**
 * Revoke all active sessions for a user (used on logout-all)
 */
const logoutAllUserSessions = async (userId) => {
  return await revokeAllUserSessions(userId);
};


/**
 * Initiate password reset flow (Phase 4.2)
 * Anti-enumeration: always returns exact same message regardless of whether email exists.
 * Generates 64-character crypto token, stores SHA-256 hash in DB with 15-minute expiry.
 */
const forgotPassword = async (email) => {
  const genericMessage = 'If an account matches that email address, password reset instructions have been sent.';

  if (!email || typeof email !== 'string') {
    return { message: genericMessage, success: true };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return { message: genericMessage, success: true };
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    // SEC-08 Anti-enumeration
    return { message: genericMessage, success: true };
  }

  // Generate 32 bytes cryptographically secure random token (64 hex characters)
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Token expires in 15 minutes (short-lived)
  user.resetPasswordToken = tokenHash;
  user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  // In production with an email provider (Resend/SendGrid/SES):
  // await sendPasswordResetEmail(user.email, rawToken);
  // Never log rawToken or leak it to client responses

  return { message: genericMessage, success: true };
};

/**
 * Complete password reset flow (Phase 4.2)
 * Validates token hash, checks expiry, updates password, clears token, and revokes all active sessions.
 */
const resetPassword = async (rawToken, newPassword) => {
  if (!rawToken || typeof rawToken !== 'string') {
    const err = new Error('Invalid or missing password reset token');
    err.statusCode = 400;
    throw err;
  }

  if (!newPassword || typeof newPassword !== 'string') {
    const err = new Error('New password is required');
    err.statusCode = 400;
    throw err;
  }

  // Strengthened password policy (SEC-09)
  if (newPassword.length < 6) {
    const err = new Error('Password must be at least 6 characters long');
    err.statusCode = 400;
    throw err;
  }

  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  if (!hasLetter || !hasNumber) {
    const err = new Error('Password must contain at least one letter and one number');
    err.statusCode = 400;
    throw err;
  }

  if (COMMON_WEAK_PASSWORDS.has(newPassword.toLowerCase())) {
    const err = new Error('Password is too common. Please choose a stronger password');
    err.statusCode = 400;
    throw err;
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    const err = new Error('Password reset token is invalid or has expired');
    err.statusCode = 400;
    throw err;
  }

  // Update password and clear reset fields
  user.password = await bcrypt.hash(newPassword, 10);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  // Invalidate all existing sessions across all devices for this user
  await revokeAllUserSessions(user._id);

  return {
    success: true,
    message: 'Password has been reset successfully. Please sign in with your new password.',
  };
};

export default {
  registerUser,
  loginUser,
  refreshUserSession,
  logoutUserSession,
  logoutAllUserSessions,
  forgotPassword,
  resetPassword,
  sanitizeUser,
};
