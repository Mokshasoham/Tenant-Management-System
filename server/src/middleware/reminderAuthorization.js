/**
 * server/src/middleware/reminderAuthorization.js
 *
 * Role-Based Access Control (RBAC) middleware for Reminder API endpoints.
 * Policies:
 *   - Admin: Full access (read, write, preview, test, retry, cancel, health)
 *   - Manager: Read & preview access (queue, history, analytics, preview, health). Blocked from retry, cancel, test-email, test-sms.
 *   - Tenant / User: 403 Forbidden for all reminder management endpoints.
 */

export function authorizeReminderRole(allowedRoles = ['admin']) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token required.'
        }
      });
    }

    const userRole = (req.user.role || '').toLowerCase();

    if (!allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Role '${userRole}' is not authorized to perform this operation.`
        }
      });
    }

    next();
  };
}

export default {
  authorizeReminderRole
};
