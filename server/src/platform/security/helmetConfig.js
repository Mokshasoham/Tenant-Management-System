import helmet from 'helmet';

/**
 * Helmet Security Headers Configuration.
 * Enforces strict Content Security Policy (CSP), frame guards, and connection protocols.
 */
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com"],
      connectSrc: ["'self'", "wss://*", "https://api.resend.com"],
      imgSrc: ["'self'", "data:", "https://*.googleusercontent.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  xFrameOptions: { action: 'deny' },
  referrerPolicy: { policy: 'same-origin' },
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
});

export default helmetConfig;
