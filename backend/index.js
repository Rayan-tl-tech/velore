import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env relative to current file and current working directory
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

// SEC-03: Validate required server environment variables on startup
if (!process.env.JWT_SECRET || typeof process.env.JWT_SECRET !== 'string' || process.env.JWT_SECRET.trim() === '') {
  console.error('FATAL: JWT_SECRET environment variable is missing.');
  process.exit(1);
}

// SEC-14: In production, Cloudinary storage is strictly required to prevent image loss on ephemeral serverless filesystems
if (process.env.NODE_ENV === 'production') {
  const missingCloudinaryVars = [];
  if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME.trim() === '') {
    missingCloudinaryVars.push('CLOUDINARY_CLOUD_NAME');
  }
  if (!process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY.trim() === '') {
    missingCloudinaryVars.push('CLOUDINARY_API_KEY');
  }
  if (!process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET.trim() === '') {
    missingCloudinaryVars.push('CLOUDINARY_API_SECRET');
  }

  if (missingCloudinaryVars.length > 0) {
    console.error(
      `FATAL: Production mode requires persistent cloud storage, but Cloudinary is not configured.\n` +
      `Missing environment variable(s): ${missingCloudinaryVars.join(', ')}.\n` +
      `Ephemeral local disk storage (/uploads) is disabled in production to prevent image loss.`
    );
    process.exit(1);
  }
}

import mongoose from 'mongoose';
import connectDB from './config/db.js';
import { cookieParserMiddleware, csrfProtectionMiddleware } from './middlewares/csrfMiddleware.js';
import authRoutes from './routes/authRoute.js';
import userRoutes from './routes/userRoute.js';
import categorieRoute from './routes/categorieRoute.js';
import productRoute from './routes/productRoute.js';
import cartRoute from './routes/cartRoute.js';
import orderRoute from './routes/orderRoute.js';
import uploadRoute from './routes/uploadRoute.js';

const app = express();

// SEC-15: Trust first-hop reverse proxy (Render edge) in production to ensure accurate client IP resolution for rate limiting
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Database connection
connectDB();

// SEC-11: Security Headers via Helmet (configured for React & external assets)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://placehold.co", "https://res.cloudinary.com"],
        connectSrc: [
          "'self'",
          process.env.FRONTEND_URL,
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:3000',
          'https://final-project-backend-5htz.onrender.com'
        ].filter(Boolean),
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows frontend to render uploaded assets
    hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
  })
);

// SEC-06: Environment-aware CORS Whitelist (Hardened for Production)
const isProduction = process.env.NODE_ENV === 'production';

// Development & test origins needed for local UI and automated test runners
const localAllowedOrigins = [
  'http://localhost:5173',
  'https://localhost:5173',
  'http://127.0.0.1:5173',
  'https://127.0.0.1:5173',
  'http://localhost:3000',
  'https://localhost:3000',
  'http://127.0.0.1:3000',
  'https://127.0.0.1:3000',
];

// Robust loopback / localhost detection using WHATWG URL parser
const isLocalhostOrigin = (origin) => {
  if (!origin || typeof origin !== 'string') return false;
  try {
    const url = new URL(origin);
    let host = url.hostname.toLowerCase().replace(/\.+$/, '');
    if (host.startsWith('[') && host.endsWith(']')) {
      host = host.slice(1, -1);
    }
    if (host === 'localhost' || host.endsWith('.localhost')) return true;
    if (host === '127.0.0.1' || host.startsWith('127.') || host === '0.0.0.0') return true;
    if (host === '::1' || host === '::' || host === '0:0:0:0:0:0:0:1') return true;
    return false;
  } catch {
    return /^https?:\/\/(localhost\.?|127\.\d+\.\d+\.\d+|\[::1\]|\[0:0:0:0:0:0:0:1\])(:\d+)?$/i.test(origin);
  }
};

const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// In production: only explicitly configured production URLs, strictly rejecting all localhost/loopback forms
// In development/test: allow local origins plus any configured frontend URL
const allowedOrigins = isProduction
  ? configuredOrigins.filter((origin) => !isLocalhostOrigin(origin))
  : [...localAllowedOrigins, ...configuredOrigins];

const isDevOrigin = (origin) => {
  if (isProduction) return false;
  if (isLocalhostOrigin(origin)) return true;
  return /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin);
};

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowed = !origin || (
    isProduction
      ? allowedOrigins.includes(origin) && !isLocalhostOrigin(origin)
      : allowedOrigins.includes(origin) || isDevOrigin(origin)
  );

  if (origin && isAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,x-velor-client');

  if (req.method === 'OPTIONS') {
    if (origin && !isAllowed) {
      return res.status(403).json({ error: 'CORS origin not allowed' });
    }
    return res.sendStatus(200);
  }

  next();
});

// SEC-05: Rate Limiters for Sensitive Endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
    success: false,
  },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 refresh requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many token refresh attempts. Please try again later.',
    success: false,
  },
});

const orderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 order submissions per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many order requests. Please wait a moment before trying again.',
    success: false,
  },
});

// MEDIUM-02: Rate limiter for file uploads (30 uploads per 15 minutes per IP)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 upload requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many upload requests. Please try again after 15 minutes.',
    success: false,
  },
});

// Phase 4.2 / 4.12: Strict rate limiter for password reset endpoints
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many password reset requests. Please try again after 15 minutes.',
    success: false,
  },
});

// Safe health & environment diagnostic endpoint for test isolation verification
app.get('/api/health', (_req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  const isProd = process.env.NODE_ENV === 'production';

  // In production, keep diagnostic minimal: do not expose internal DB names or topology
  if (isProd) {
    return res.status(isConnected ? 200 : 503).json({
      status: isConnected ? 'ok' : 'degraded',
      message: 'E-commerce API is active and running!',
    });
  }

  // Non-production (test & dev): allow local test runners to strictly verify active DB
  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? 'ok' : 'degraded',
    env: process.env.NODE_ENV || 'development',
    database: isConnected ? (mongoose.connection.name || null) : null,
    connected: isConnected,
  });
});

// Health check endpoint for deployment monitoring
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'E-commerce API is active and running!' });
});

// Parse HttpOnly cookies (Phase 3 authentication)
app.use(cookieParserMiddleware);

// SEC-12: Explicit Request Body Limits
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Apply rate limiters to authentication routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/refresh', refreshLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);

// CSRF Protection for state-changing cookie-based endpoints
const csrfProtection = csrfProtectionMiddleware(allowedOrigins);
app.use('/api/auth/refresh', csrfProtection);
app.use('/api/auth/logout', csrfProtection);

// Protect order creation
app.use('/api/orders', (req, res, next) => {
  if (req.method === 'POST') {
    return orderLimiter(req, res, next);
  }
  next();
});

// MEDIUM-02: Protect image upload endpoint with rate limiter
app.use('/api/upload', (req, res, next) => {
  if (req.method === 'POST') {
    return uploadLimiter(req, res, next);
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categorieRoute);
app.use('/api/products', productRoute);
app.use('/api/cart', cartRoute);
app.use('/api/orders', orderRoute);
app.use('/api/upload', uploadRoute);

// Hardened static uploads serving
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    next();
  },
  express.static(path.join(__dirname, 'uploads'))
);

// Fallback for undefined API routes
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found', success: false });
});

// SEC-13: Centralized sanitized error handling middleware
app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || (err.name === 'CastError' ? 400 : 500);
  const isProd = process.env.NODE_ENV === 'production';

  let message = err.message || 'Internal Server Error';
  if (err.name === 'CastError') {
    message = 'Invalid resource identifier format';
  } else if (statusCode === 500 && isProd) {
    message = 'An unexpected server error occurred. Please try again later.';
  }

  if (statusCode === 500) {
    console.error('Unhandled server error:', err);
  }

  res.status(statusCode).json({
    error: message,
    success: false
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

