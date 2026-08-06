import { verifyToken } from '../utils/jwt.js';
import { AppError, asyncHandler } from '../utils/errorHandling.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    throw new AppError('No token provided. Please login', 401);
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    throw new AppError(err.message, 401);
  }
});

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Unauthorized access', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(
        `User role '${req.user.role}' is not authorized to access this resource`,
        403
      );
    }

    next();
  };
};

export const adminOnly = authorize('admin');
export const managerOrAdmin = authorize('manager', 'admin');
export const authorizeRoles = authorize;
