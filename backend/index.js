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
// (deferred to startServer() below)

// SEC-06: Environment-aware Origin Resolution (Hardened for Production)
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

// STEP 9.3.4D: Production FRONTEND_URL validator
const validateFrontendUrl = (rawUrl, isProd = process.env.NODE_ENV === 'production') => {
  if (!isProd) return { valid: true };
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return { valid: false, error: 'FRONTEND_URL environment variable is missing in production mode.' };
  }
  const origins = rawUrl.split(',').map((u) => u.trim().replace(/\/+$/, '')).filter(Boolean);
  if (origins.length === 0) {
    return { valid: false, error: 'FRONTEND_URL must contain at least one valid URL in production mode.' };
  }
  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      return { valid: false, error: 'FRONTEND_URL origin "' + origin + '" is not a valid absolute URL.' };
    }
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Insecure FRONTEND_URL "' + origin + '". Production frontend URL must use HTTPS.' };
    }
    if (isLocalhostOrigin(origin)) {
      return { valid: false, error: 'FRONTEND_URL "' + origin + '" points to localhost/loopback, which is prohibited in production.' };
    }
  }
  return { valid: true, origins };
};

// STEP 9.3.4D: Fail fast on startup in production if FRONTEND_URL is missing or invalid
if (isProduction) {
  const frontendCheck = validateFrontendUrl(process.env.FRONTEND_URL, true);
  if (!frontendCheck.valid) {
    console.error('FATAL: ' + frontendCheck.error);
    process.exit(1);
  }
}

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
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows frontend to render uploaded assets
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
  })
);

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

// STEP 9.3.4C: Global API Rate Limiter
// Protects backend against excessive abusive polling, aggressive scraping, and high-frequency hammering.
// In-memory store protects single-instance Node.js processes; edge/CDN filtering handles distributed DDoS.
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.GLOBAL_RATE_LIMIT_MAX) || 300, // 300 requests per 15 minutes per IP
  standardHeaders: true, // draft-6/7 RateLimit-* headers
  legacyHeaders: false, // disable legacy X-RateLimit-* headers
  skip: (req) => {
    // Exempt CORS preflight requests
    if (req.method === 'OPTIONS') return true;

    // Exempt health, liveness, and readiness endpoints
    const path = req.path || '';
    if (
      path === '/health' || path.startsWith('/health/') ||
      path === '/live' || path.startsWith('/live/') ||
      path === '/ready' || path.startsWith('/ready/')
    ) {
      return true;
    }

    const originalUrl = (req.originalUrl || '').split('?')[0];
    if (
      originalUrl === '/api/health' || originalUrl.startsWith('/api/health/') ||
      originalUrl === '/api/live' || originalUrl.startsWith('/api/live/') ||
      originalUrl === '/api/ready' || originalUrl.startsWith('/api/ready/')
    ) {
      return true;
    }

    return false;
  },
  message: {
    error: 'Too many requests from this IP. Please wait a moment before trying again.',
    success: false,
  },
});

// STEP 9.3.4E: Dedicated Liveness Endpoint
// Proves that the Node.js process and HTTP event loop are alive, independent of database state.
app.get(['/api/live', '/api/health/live'], (_req, res) => {
  res.status(200).json({
    status: 'live',
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});

// STEP 9.3.4E: Dedicated Readiness Endpoint
// Proves that the server is ready to accept user traffic (HTTP server alive AND MongoDB connected).
app.get(['/api/ready', '/api/health/ready'], (_req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  const isProd = process.env.NODE_ENV === 'production';

  if (isConnected) {
    return res.status(200).json({
      status: 'ready',
      database: isProd ? 'connected' : (mongoose.connection.name || 'connected'),
    });
  }

  return res.status(503).json({
    status: 'unavailable',
    database: 'disconnected',
    message: 'Database connection is not ready to serve traffic.',
  });
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

// STEP 9.3.4C: Apply global rate limiter across all /api routes
app.use('/api', globalApiLimiter);

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
const parsedShutdownTimeout = Number(process.env.SHUTDOWN_TIMEOUT_MS);
const SHUTDOWN_TIMEOUT_MS = Number.isFinite(parsedShutdownTimeout) && parsedShutdownTimeout > 0
  ? parsedShutdownTimeout
  : 20000;

// STEP 9.3.4A: HTTP server timeouts configuration for reverse proxy resilience
const parsedKeepAliveTimeout = Number(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS);
const HTTP_KEEP_ALIVE_TIMEOUT_MS = Number.isFinite(parsedKeepAliveTimeout) && parsedKeepAliveTimeout > 0
  ? parsedKeepAliveTimeout
  : 65000;

const parsedHeadersTimeout = Number(process.env.HTTP_HEADERS_TIMEOUT_MS);
const HTTP_HEADERS_TIMEOUT_MS = Number.isFinite(parsedHeadersTimeout) && parsedHeadersTimeout > 0
  ? parsedHeadersTimeout
  : 66000;

const parsedRequestTimeout = Number(process.env.HTTP_REQUEST_TIMEOUT_MS);
const HTTP_REQUEST_TIMEOUT_MS = Number.isFinite(parsedRequestTimeout) && parsedRequestTimeout > 0
  ? parsedRequestTimeout
  : 120000;

let server = null;
let isShuttingDown = false;
let finalExitCode = 0;

/**
 * Handles graceful shutdown of HTTP server and MongoDB connections.
 * Enforces single-execution locking, one-way exit code escalation,
 * independent sequential resource cleanup, and a safety watchdog.
 *
 * @param {string} signal - The triggering POSIX signal or error event
 * @param {number} [targetExitCode=0] - Requested exit code (0 for signals, 1 for fatal errors)
 */
export async function gracefulShutdown(signal, targetExitCode = 0) {
  if (isShuttingDown) {
    // Situation A: A normal shutdown (SIGTERM/SIGINT) was in progress (finalExitCode === 0)
    // and a fatal error occurs (targetExitCode !== 0). We must escalate and force exit 1 immediately.
    if (finalExitCode === 0 && targetExitCode !== 0) {
      finalExitCode = targetExitCode;
      console.error(`💥 Fatal error occurred during active normal shutdown (${signal}). Forcing immediate exit with code 1.`);
      process.exitCode = 1;
      process.exit(1);
    }

    // Situation B: A fatal shutdown was already in progress (finalExitCode !== 0), or another normal signal arrives.
    // Preserve the fatal exit code, do NOT interrupt the ongoing cleanup, do NOT start a duplicate cleanup.
    if (targetExitCode !== 0) {
      finalExitCode = targetExitCode;
    }
    console.log(`⚠️ Shutdown already in progress. Ignoring additional signal: ${signal}`);
    return;
  }

  // First shutdown event
  isShuttingDown = true;
  if (targetExitCode !== 0) {
    finalExitCode = targetExitCode;
  }
  console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);

  // Safety watchdog timer to prevent indefinite hanging (uses shorter timeout for fatal errors if configured)
  const timeoutMs = targetExitCode !== 0
    ? Math.min(SHUTDOWN_TIMEOUT_MS, Number(process.env.FATAL_SHUTDOWN_TIMEOUT_MS) || 5000)
    : SHUTDOWN_TIMEOUT_MS;

  const forceExitTimer = setTimeout(() => {
    console.error(`⚠️ Graceful shutdown timed out after ${timeoutMs / 1000}s. Forcing exit.`);
    process.exitCode = 1;
    process.exit(1);
  }, timeoutMs);
  forceExitTimer.unref();

  let cleanupFailure = false;

  try {
    // Phase 2: Close HTTP server (stop accepting new connections, drain in-flight)
    if (server && server.listening) {
      try {
        console.log('⏳ Closing HTTP server and draining active requests...');

        // Lower keepAliveTimeout during shutdown so in-flight requests that finish
        // do not keep persistent connections open for 65s, allowing server.close() to finish cleanly
        server.keepAliveTimeout = 1000;

        await new Promise((resolve, reject) => {
          server.close((err) => {
            if (err) return reject(err);
            resolve();
          });

          if (typeof server.closeIdleConnections === 'function') {
            server.closeIdleConnections();
          }
        });
        console.log('✅ HTTP server closed successfully.');
      } catch (httpError) {
        console.error('❌ Error closing HTTP server:', httpError.message || httpError);
        cleanupFailure = true;
      }
    }

    // Phase 2: Close MongoDB connection cleanly (attempted regardless of HTTP server closure outcome)
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      try {
        console.log('⏳ Closing MongoDB connection...');
        await mongoose.connection.close(false);
        console.log('✅ MongoDB connection closed successfully.');
      } catch (dbError) {
        console.error('❌ Error closing MongoDB connection:', dbError.message || dbError);
        cleanupFailure = true;
      }
    }

    clearTimeout(forceExitTimer);

    if (cleanupFailure) {
      console.error('❌ Graceful shutdown finished with cleanup failure(s). Forcing exit code 1.');
      process.exitCode = 1;
      process.exit(1);
    } else if (finalExitCode !== 0) {
      console.error(`🛑 Fatal graceful shutdown completed with failure code ${finalExitCode}.`);
      process.exitCode = finalExitCode;
      process.exit(finalExitCode);
    } else {
      console.log('👋 Graceful shutdown completed cleanly.');
      process.exitCode = 0;
      process.exit(0);
    }
  } catch (unexpectedError) {
    clearTimeout(forceExitTimer);
    console.error('❌ Unexpected error during graceful shutdown:', unexpectedError.message || unexpectedError);
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      try {
        await mongoose.connection.close(false);
      } catch {}
    }
    process.exitCode = 1;
    process.exit(1);
  }
}

/**
 * Starts the application server with strict lifecycle ordering:
 * 1. Awaits and verifies MongoDB connection.
 * 2. Starts HTTP listener.
 * 3. Registers process-level fatal error handlers and OS signal handlers.
 */
export async function startServer() {
  try {
    // Phase 1: Initialize and verify database connection before opening port
    console.log('⏳ Initializing database connection...');
    await connectDB();
    if (mongoose.connection.readyState !== 1) {
      throw new Error(`MongoDB connection verification failed: readyState is ${mongoose.connection.readyState} (expected 1)`);
    }

    // Attach diagnostic-only Mongoose connection lifecycle listeners
    if (!mongoose.connection._hasDiagnosticListeners) {
      mongoose.connection.on('error', (err) => {
        console.error('⚠️ MongoDB runtime connection error:', err.message || err);
      });
      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB connection disconnected. Driver will attempt automatic reconnection.');
      });
      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB connection re-established.');
      });
      mongoose.connection._hasDiagnosticListeners = true;
    }

    // Phase 1: Start HTTP server and capture instance with clean listener lifecycle
    await new Promise((resolve, reject) => {
      const listeningServer = app.listen(process.env.PORT || PORT || 5000);

      // STEP 9.3.4A: Apply HTTP server timeouts to prevent reverse proxy 502 race conditions
      // and protect against slow-client resource exhaustion
      listeningServer.keepAliveTimeout = HTTP_KEEP_ALIVE_TIMEOUT_MS;
      // headersTimeout must strictly exceed keepAliveTimeout per Node.js specifications
      listeningServer.headersTimeout = Math.max(HTTP_HEADERS_TIMEOUT_MS, listeningServer.keepAliveTimeout + 1000);
      listeningServer.requestTimeout = HTTP_REQUEST_TIMEOUT_MS;

      const onListening = () => {
        cleanup();
        server = listeningServer;
        console.log(`🚀 Server running on port ${process.env.PORT || PORT || 5000}`);
        resolve(server);
      };

      const onError = (err) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        listeningServer.removeListener('listening', onListening);
        listeningServer.removeListener('error', onError);
      };

      listeningServer.once('listening', onListening);
      listeningServer.once('error', onError);
    });

    // Phase 3: Register process-level fatal error handlers
    process.on('unhandledRejection', (reason) => {
      const formattedReason = reason instanceof Error
        ? (reason.stack || reason.message)
        : String(reason);
      console.error(`💥 FATAL UNHANDLED REJECTION at process level:\n${formattedReason}`);
      gracefulShutdown('unhandledRejection', 1);
    });

    process.on('uncaughtException', (error) => {
      const formattedError = error instanceof Error
        ? (error.stack || error.message)
        : String(error);
      console.error(`💥 FATAL UNCAUGHT EXCEPTION at process level:\n${formattedError}`);

      // Synchronously close listening socket if open to release port immediately
      if (server && typeof server.close === 'function') {
        try {
          server.close();
        } catch {
          // Ignore synchronous close error on corrupted state
        }
      }

      process.exitCode = 1;
      process.exit(1);
    });

    // Phase 3: Register signal handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM', 0));
    process.on('SIGINT', () => gracefulShutdown('SIGINT', 0));

    return server;
  } catch (error) {
    console.error('❌ Fatal error during server startup:', error.message || error);
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      try {
        await mongoose.connection.close(false);
        console.log('✅ MongoDB connection closed after startup failure.');
      } catch (dbErr) {
        console.error('❌ Error closing MongoDB after startup failure:', dbErr.message || dbErr);
      }
    }
    process.exitCode = 1;
    process.exit(1);
  }
}


export const isMainModule = () => {
  if (!process.argv[1]) return false;
  try {
    const currentFilePath = fileURLToPath(import.meta.url);
    const invokedPath = path.resolve(process.argv[1]);
    return process.platform === 'win32'
      ? currentFilePath.toLowerCase() === invokedPath.toLowerCase()
      : currentFilePath === invokedPath;
  } catch {
    return false;
  }
};

if (isMainModule()) {
  await startServer();
}

export { app, server, globalApiLimiter, isLocalhostOrigin, validateFrontendUrl };
export default app;
