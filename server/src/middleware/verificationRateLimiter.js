import rateLimit from 'express-rate-limit';
import logger from '../platform/logging/logger.js';
import cacheProvider from '../platform/cache/cacheProvider.js';

/**
 * Custom Key Generator: Key by authenticated User ID if available, otherwise by IP.
 */
const keyGenerator = (req) => {
  if (req.user && (req.user._id || req.user.id)) {
    return `user:${req.user._id || req.user.id}:${req.ip}`;
  }
  return `ip:${req.ip}`;
};

/**
 * Standardized 429 Handler for Verification Operations.
 */
const limitReachedHandler = (req, res, next, options) => {
  logger.warn(`[VerificationRateLimiter] Rate limit exceeded for key=${keyGenerator(req)} on path=${req.originalUrl}`);
  
  const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
  res.setHeader('Retry-After', retryAfterSeconds);
  
  return res.status(429).json({
    status: 429,
    error: 'Too Many Requests',
    message: options.message || 'Too many verification requests. Please wait before retrying.',
    retryAfterSeconds,
  });
};

/**
 * Dynamic Store Resolver: Use cacheProvider if initialized/supported, fallback to memory.
 */
const getStoreOptions = () => {
  if (cacheProvider && cacheProvider.store && typeof cacheProvider.store.init === 'function') {
    return { store: cacheProvider.store };
  }
  return {}; // default express-rate-limit MemoryStore
};

/**
 * 1. Global Verification Endpoint Limiter (General status reads, listing)
 * - 100 requests per 15 minutes window
 */
export const globalVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  validate: { default: false },
  handler: (req, res, next, options) => limitReachedHandler(req, res, next, {
    ...options,
    message: 'Global verification request limit exceeded. Please try again in a few minutes.',
  }),
  ...getStoreOptions(),
});

/**
 * 2. Sensitive Verification Operations Limiter (Identity, Property, DigiLocker, Face)
 * - 20 requests per 15 minutes window
 */
export const sensitiveVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  validate: { default: false },
  handler: (req, res, next, options) => limitReachedHandler(req, res, next, {
    ...options,
    message: 'Verification submission limit exceeded for sensitive biometric and document operations.',
  }),
  ...getStoreOptions(),
});

/**
 * 3. Government API & OTP Verification Operations Limiter (Aadhaar OTP, PAN, GST)
 * - 10 requests per 15 minutes window
 */
export const governmentOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  validate: { default: false },
  handler: (req, res, next, options) => limitReachedHandler(req, res, next, {
    ...options,
    message: 'Government identity lookups and OTP request limit exceeded. Please wait 15 minutes before retrying.',
  }),
  ...getStoreOptions(),
});

/**
 * 4. Administrative Verification Operations Limiter (Admin unlocks, Manual reviews)
 * - 40 requests per 15 minutes window
 */
export const adminVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  validate: { default: false },
  handler: (req, res, next, options) => limitReachedHandler(req, res, next, {
    ...options,
    message: 'Administrative verification operation limit reached.',
  }),
  ...getStoreOptions(),
});

export default {
  globalVerificationLimiter,
  sensitiveVerificationLimiter,
  governmentOtpLimiter,
  adminVerificationLimiter,
};
