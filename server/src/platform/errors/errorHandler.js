import logger from '../logging/logger.js';
import { DomainError } from './errorCatalog.js';

/**
 * Standardized error handling middleware.
 * Formats all exceptions consistently for client consumption.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'SYSTEM_INTERNAL_ERROR';
  let message = err.message || 'An unexpected internal system error occurred.';
  const requestId = req.requestId || 'unknown';

  // 1. Process specific framework and database exceptions
  if (err instanceof DomainError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    // Mongoose Validation Error
    statusCode = 400;
    code = 'VALIDATION_MALFORMED';
    message = Object.values(err.errors).map(val => val.message).join(', ');
  } else if (err.name === 'CastError') {
    // Mongo Cast Error
    statusCode = 400;
    code = 'VALIDATION_MALFORMED';
    message = `Invalid format for field ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    // Mongo Duplicate Key
    statusCode = 400;
    code = 'VALIDATION_DUPLICATE';
    message = 'A record with duplicate properties already exists.';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'AUTH_UNAUTHORIZED';
    message = 'Invalid auth token. Please login again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'AUTH_UNAUTHORIZED';
    message = 'Auth token has expired. Please login again.';
  }

  // 2. Log error details with structured logging context
  logger.error(`Error encountered: ${message}`, {
    code,
    statusCode,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // 3. Return standardized payload
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      requestId
    }
  });
};

export default errorHandler;
