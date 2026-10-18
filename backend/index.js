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

import connectDB from './config/db.js';
import authRoutes from './routes/authRoute.js';
import userRoutes from './routes/userRoute.js';
import categorieRoute from './routes/categorieRoute.js';
import productRoute from './routes/productRoute.js';
import cartRoute from './routes/cartRoute.js';
import orderRoute from './routes/orderRoute.js';

const app = express();

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
        imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://placehold.co"],
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

// SEC-06: Configurable CORS Whitelist (Removes wildcard '*')
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'https://localhost:5173',
  'http://127.0.0.1:5173',
  'https://127.0.0.1:5173',
  'http://localhost:3000',
  'https://localhost:3000',
  'http://127.0.0.1:3000',
  'https://127.0.0.1:3000',
];

const envFrontendUrl = process.env.FRONTEND_URL?.trim().replace(/\/+$/, '');
const allowedOrigins = [
  ...defaultAllowedOrigins,
  ...(envFrontendUrl ? [envFrontendUrl] : [])
];

const isDevOrigin = (origin) => {
  if (process.env.NODE_ENV === 'production') return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin);
};

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowed = !origin || allowedOrigins.includes(origin) || isDevOrigin(origin);

  if (origin && isAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');

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

// Health check endpoint for deployment monitoring
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'E-commerce API is active and running!' });
});

// SEC-12: Explicit Request Body Limits
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Apply rate limiters to authentication routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Protect order creation
app.use('/api/orders', (req, res, next) => {
  if (req.method === 'POST') {
    return orderLimiter(req, res, next);
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categorieRoute);
app.use('/api/products', productRoute);
app.use('/api/cart', cartRoute);
app.use('/api/orders', orderRoute);

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

