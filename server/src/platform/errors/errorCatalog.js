/**
 * Standard Application Error Base Class.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * DomainError representing a standardized business operations error.
 */
export class DomainError extends AppError {
  constructor(errorDefinition) {
    super(errorDefinition.message, errorDefinition.statusCode);
    this.code = errorDefinition.code;
  }
}

/**
 * Reusable SaaS Error Catalog.
 * Contains both domain-grouped maps and flat compatibility keys.
 */
export const ErrorCatalog = {
  // 1. Domain Grouped Catalog
  AUTH: {
    UNAUTHORIZED: { code: 'AUTH_UNAUTHORIZED', message: 'Access denied: Authentication token is invalid or missing.', statusCode: 401 },
    FORBIDDEN: { code: 'AUTH_FORBIDDEN', message: 'Access denied: You do not have permissions to perform this action.', statusCode: 403 }
  },
  LEASE: {
    NOT_FOUND: { code: 'LEASE_NOT_FOUND', message: 'The specified lease record was not found.', statusCode: 404 },
    ALREADY_EXPIRED: { code: 'LEASE_ALREADY_EXPIRED', message: 'The associated lease has already expired or is terminated.', statusCode: 400 },
    RENEWAL_ALREADY_EXISTS: { code: 'RENEWAL_ALREADY_EXISTS', message: 'An active lease renewal request already exists.', statusCode: 400 },
    INVALID_TRANSITION: { code: 'LEASE_INVALID_TRANSITION', message: 'Invalid status transition requested.', statusCode: 400 },
    OUTSTANDING_BALANCE: { code: 'LEASE_OUTSTANDING_BALANCE', message: 'Lease renewal is blocked due to outstanding unpaid payments.', statusCode: 400 },
    OPEN_TICKETS: { code: 'LEASE_OPEN_TICKETS', message: 'Lease renewal is blocked due to open maintenance tickets.', statusCode: 400 }
  },
  PROPERTY: {
    INACTIVE: { code: 'PROPERTY_INACTIVE', message: 'This operation is not allowed because the property is inactive.', statusCode: 400 }
  },
  SYSTEM: {
    CONCURRENT_UPDATE: { code: 'SYSTEM_CONCURRENT_UPDATE', message: 'Conflict: This record was modified by another request. Please reload and retry.', statusCode: 409 },
    INTERNAL_SERVER_ERROR: { code: 'SYSTEM_INTERNAL_ERROR', message: 'An unexpected internal system error occurred.', statusCode: 500 }
  },
  VALIDATION: {
    MALFORMED_REQUEST: { code: 'VALIDATION_MALFORMED', message: 'The request body parameters are malformed.', statusCode: 400 }
  },

  // 2. Flat Compatibility Keys for Backward Compatibility
  UNAUTHORIZED_RENEWAL: { code: 'AUTH_FORBIDDEN', message: 'Access denied: You do not have permissions to perform this action.', statusCode: 403 },
  LEASE_ALREADY_EXPIRED: { code: 'LEASE_ALREADY_EXPIRED', message: 'The associated lease has already expired.', statusCode: 400 },
  RENEWAL_ALREADY_EXISTS: { code: 'RENEWAL_ALREADY_EXISTS', message: 'An active renewal request already exists for this lease.', statusCode: 400 },
  INACTIVE_PROPERTY: { code: 'INACTIVE_PROPERTY', message: 'This operation is not allowed because the property or tenant is inactive.', statusCode: 400 },
  OUTSTANDING_RENT_BALANCE: { code: 'OUTSTANDING_RENT_BALANCE', message: 'Lease renewal is blocked due to outstanding unpaid payments.', statusCode: 400 },
  OPEN_MAINTENANCE_TICKETS: { code: 'OPEN_MAINTENANCE_TICKETS', message: 'Lease renewal is blocked due to open maintenance tickets.', statusCode: 400 },
  LEASE_NOT_FOUND: { code: 'LEASE_NOT_FOUND', message: 'The specified lease record was not found.', statusCode: 404 },
  INVALID_STATE_TRANSITION: { code: 'INVALID_STATE_TRANSITION', message: 'The requested status transition is not permitted.', statusCode: 400 },
  CONCURRENT_UPDATE_REVISION: { code: 'CONCURRENT_UPDATE_REVISION', message: 'Conflict: This record has been updated by another user. Please refresh and try again.', statusCode: 409 }
};
