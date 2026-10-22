import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    throw new Error('Authentication configuration error: JWT_SECRET is not configured on the server.');
  }
  return secret;
};

const authMiddleware = async (req, res, next) => {
  try {
    // Récupérer le token dans l'en-tête
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.', expired: false });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ error: 'Access denied. No token provided.', expired: false });
    }

    // Vérifier et décoder le token
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);

    // Chercher l'utilisateur sans le champ password
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Session expired or user account not found. Please sign in again.', expired: true });
    }

    // Attacher l'utilisateur à la requête
    req.user = user;
    next();
  } catch (error) {
    const isExpired = error.name === 'TokenExpiredError';
    console.error('Auth error:', error.message);
    return res.status(401).json({ 
      error: isExpired ? 'Your session has expired. Please sign in again.' : 'Invalid or expired token.',
      expired: isExpired,
    });
  }
};

export const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      req.user = null;
      return next();
    }
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token || token === 'null' || token === 'undefined') {
      req.user = null;
      return next();
    }

    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).select('-password');
    req.user = user || null;
    next();
  } catch (_error) {
    req.user = null;
    next();
  }
};

export default authMiddleware;


