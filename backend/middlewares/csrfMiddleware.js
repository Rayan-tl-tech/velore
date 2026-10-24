/**
 * Lightweight cookie parsing middleware (zero external dependencies).
 * Extracts raw cookie headers into req.cookies object.
 */
export const cookieParserMiddleware = (req, _res, next) => {
  const cookieHeader = req.headers?.cookie;
  req.cookies = {};

  if (cookieHeader && typeof cookieHeader === 'string') {
    const parts = cookieHeader.split(';');
    for (const part of parts) {
      const idx = part.indexOf('=');
      if (idx > -1) {
        const key = part.slice(0, idx).trim();
        const rawVal = part.slice(idx + 1).trim();
        try {
          req.cookies[key] = decodeURIComponent(rawVal);
        } catch {
          req.cookies[key] = rawVal;
        }
      }
    }
  }

  next();
};

/**
 * CSRF Protection Middleware for cookie-based state-changing endpoints (/api/auth/refresh, /api/auth/logout).
 *
 * Defense-in-depth strategy:
 * 1. Safe methods (GET, HEAD, OPTIONS) are bypassed.
 * 2. Origin/Referer check: Verifies that the request originated from an explicitly allowed domain.
 * 3. Custom Header check: If neither origin nor referer is provided (e.g. strict privacy tools),
 *    validates custom client header (e.g. 'x-requested-with' or 'x-client-type'). Cross-origin HTML forms
 *    and links cannot set custom headers without preflight.
 */
export const csrfProtectionMiddleware = (allowedOrigins = []) => {
  const isDevOrigin = (origin) => {
    if (process.env.NODE_ENV === 'production') return false;
    return /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin);
  };

  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const origin = req.headers.origin;
    const referer = req.headers.referer;

    let refererOrigin = null;
    if (referer) {
      try {
        const url = new URL(referer);
        refererOrigin = url.origin;
      } catch {}
    }

    const requestOrigin = origin || refererOrigin;

    // Check custom header as an alternative CSRF proof
    const customHeader = req.headers['x-requested-with'] || req.headers['x-velor-client'];

    if (requestOrigin) {
      const isAllowed =
        allowedOrigins.includes(requestOrigin) || isDevOrigin(requestOrigin);

      if (!isAllowed) {
        return res.status(403).json({
          error: 'Cross-Site Request Forgery (CSRF) protection: untrusted origin',
          success: false,
        });
      }
      return next();
    }

    // If no origin/referer header was sent (e.g. server-to-server or specific tools),
    // require custom header in production
    if (customHeader) {
      return next();
    }

    // In local development, permit tools like Postman / cURL without Origin header
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    return res.status(403).json({
      error: 'Cross-Site Request Forgery (CSRF) protection: missing Origin or verification header',
      success: false,
    });
  };
};

export default { cookieParserMiddleware, csrfProtectionMiddleware };
