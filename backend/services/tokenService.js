import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import Session from '../models/sessionModel.js';
import User from '../models/userModel.js';

const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_TTL_DAYS = 7;
const REFRESH_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    throw new Error('Authentication configuration error: JWT_SECRET is not configured on the server.');
  }
  return secret;
};

/**
 * Computes SHA-256 hash of a raw token for secure database storage.
 */
export const hashToken = (token) => {
  if (!token || typeof token !== 'string') return '';
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generates an 80-character cryptographically secure random refresh token.
 */
export const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

/**
 * Signs a short-lived access token (default: 15 minutes).
 */
export const generateAccessToken = (user) => {
  const secret = getJwtSecret();
  const roles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : ['user']);
  return jwt.sign(
    {
      id: user._id,
      roles,
    },
    secret,
    { expiresIn: JWT_ACCESS_EXPIRES_IN }
  );
};

/**
 * Express cookie options for the HttpOnly refresh token cookie.
 */
export const getRefreshCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: REFRESH_TTL_MS,
  };
};

/**
 * Clears the refresh token cookie with matching attributes.
 */
export const clearRefreshCookie = (res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth',
  });
};

/**
 * Creates a new session in MongoDB and returns the raw refresh token.
 */
export const createSession = async (userId, req = null) => {
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  const userAgent = req?.headers?.['user-agent'] || '';
  const ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';

  const session = await Session.create({
    userId,
    tokenHash,
    expiresAt,
    userAgent: String(userAgent).slice(0, 500),
    ip: String(ip).slice(0, 100),
  });

  return { rawRefreshToken, session };
};

/**
 * Rotates a refresh token:
 * - Hashes incoming token and looks up session
 * - Detects reuse: if session was already revoked, immediately revokes all descendant/user sessions
 * - If valid, revokes old session and atomically creates new session
 * - Returns new raw refresh token, new access token, and user doc
 */
export const rotateSession = async (rawRefreshToken, req = null) => {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
    const err = new Error('No refresh token provided');
    err.statusCode = 401;
    throw err;
  }

  const tokenHash = hashToken(rawRefreshToken);
  const session = await Session.findOne({ tokenHash });

  if (!session) {
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }

  // REUSE DETECTION: If session was already revoked, a compromised token is being reused!
  if (session.revokedAt) {
    console.warn(`[SECURITY ALERT] Refresh token reuse detected for user ${session.userId}. Invalidating sessions.`);
    // Invalidate all active sessions for this user as a security measure
    await Session.updateMany(
      { userId: session.userId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    const err = new Error('Session terminated due to token reuse detection. Please sign in again.');
    err.statusCode = 401;
    throw err;
  }

  // Check if session has expired
  if (new Date() > session.expiresAt) {
    session.revokedAt = new Date();
    await session.save();
    const err = new Error('Refresh token expired. Please sign in again.');
    err.statusCode = 401;
    throw err;
  }

  // Find user to verify account is still active
  const user = await User.findById(session.userId).select('-password');
  if (!user) {
    session.revokedAt = new Date();
    await session.save();
    const err = new Error('User account not found');
    err.statusCode = 401;
    throw err;
  }

  // Issue new refresh token & session
  const newRawRefreshToken = generateRefreshToken();
  const newTokenHash = hashToken(newRawRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  // Revoke current session and link to replacement
  session.revokedAt = new Date();
  session.replacedBy = newTokenHash;
  await session.save();

  // Create replacement session
  const userAgent = req?.headers?.['user-agent'] || session.userAgent;
  const ip = req?.ip || req?.headers?.['x-forwarded-for'] || session.ip;

  await Session.create({
    userId: user._id,
    tokenHash: newTokenHash,
    expiresAt: newExpiresAt,
    userAgent: String(userAgent).slice(0, 500),
    ip: String(ip).slice(0, 100),
  });

  // Issue new access token
  const accessToken = generateAccessToken(user);

  return {
    newRawRefreshToken,
    accessToken,
    user,
  };
};

/**
 * Revokes a single session by raw refresh token (used on logout).
 */
export const revokeSession = async (rawRefreshToken) => {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string') return false;
  const tokenHash = hashToken(rawRefreshToken);
  const result = await Session.findOneAndUpdate(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: new Date() } },
    { returnDocument: 'after' }
  );
  return !!result;
};

/**
 * Revokes all sessions for a user (used on logout-all or security events).
 */
export const revokeAllUserSessions = async (userId) => {
  if (!userId) return 0;
  const result = await Session.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  return result.modifiedCount || 0;
};

export default {
  hashToken,
  generateRefreshToken,
  generateAccessToken,
  getRefreshCookieOptions,
  clearRefreshCookie,
  createSession,
  rotateSession,
  revokeSession,
  revokeAllUserSessions,
};
