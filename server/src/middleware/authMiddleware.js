/**
 * server/src/middleware/authMiddleware.js
 *
 * Compatibility shim — re-exports the canonical auth middleware (auth.js)
 * under the names expected by v1 routes that import { protect, restrictTo }.
 *
 *   protect   → authenticate  (verifies JWT, attaches req.user)
 *   restrictTo → authorize    (RBAC role guard)
 */

export { authenticate, authenticate as protect, authorize, authorize as restrictTo, authorize as authorizeRoles } from './auth.js';
