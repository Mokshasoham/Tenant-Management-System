import errorHandler from '../platform/errors/errorHandler.js';
import { AppError } from '../platform/errors/errorCatalog.js';

export { errorHandler, AppError };

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    return fn(req, res, next).catch(next);
  };
};

export const catchAsync = asyncHandler;

export const notFoundHandler = (req, res) => {
  const requestId = req.requestId || 'unknown';
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested routing path was not found.',
      requestId
    }
  });
};
