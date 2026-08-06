import logger from '../logging/logger.js';
import { DomainError } from './errorCatalog.js';

/**
 * Standardized error handling middleware.
 * Formats all exceptions consistently for client consumption.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || (statusCode === 400 ? 'VALIDATION_MALFORMED' : statusCode === 409 ? 'DUPLICATE_RESOURCE' : statusCode === 403 ? 'AUTH_FORBIDDEN' : statusCode === 401 ? 'AUTH_UNAUTHORIZED' : 'SYSTEM_INTERNAL_ERROR');
  let message = err.message || 'An unexpected internal system error occurred.';
  let field = err.field || null;
  let details = err.details || null;
  const requestId = req.requestId || 'unknown';

  // 1. Process specific framework and database exceptions
  if (err instanceof DomainError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    // Mongoose Validation Error
    statusCode = 400;
    code = 'TECHNICIAN_VALIDATION_FAILED';
    const errValues = Object.values(err.errors || {});
    message = errValues.map(val => val.message).join(', ') || 'Validation failed';
    if (errValues.length > 0) {
      field = errValues[0].path;
      details = errValues.map(val => ({ field: val.path, message: val.message }));
    }
  } else if (err.name === 'CastError') {
    // Mongo Cast Error
    statusCode = 422;
    code = 'MALFORMED_INPUT';
    field = err.path;
    message = `Invalid format for field ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    // Mongo Duplicate Key
    statusCode = 409;
    code = 'DUPLICATE_RESOURCE';
    const dupField = Object.keys(err.keyValue || {})[0] || 'field';
    field = dupField;
    message = `A record with duplicate ${dupField} ('${err.keyValue?.[dupField]}') already exists.`;
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

  // 3. Return standardized payload matching Step 3 API contract
  res.status(statusCode).json({
    success: false,
    code,
    message,
    ...(field ? { field } : {}),
    ...(details ? { details } : {}),
    error: {
      code,
      message,
      requestId,
      ...(field ? { field } : {}),
      ...(details ? { details } : {})
    }
  });
};

export default errorHandler;
