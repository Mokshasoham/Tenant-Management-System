import { AppError } from '../../utils/errorHandling.js';

/**
 * Custom operational error code subclass of AppError.
 */
export class DomainError extends AppError {
  constructor(errorDefinition) {
    super(errorDefinition.message, errorDefinition.statusCode);
    this.code = errorDefinition.code;
  }
}

/**
 * Reusable Error Catalog.
 * Centralized registry of application error definitions.
 */
export const ErrorCatalog = {
  LEASE_ALREADY_EXPIRED: {
    code: 'LEASE_ALREADY_EXPIRED',
    message: 'The associated lease has already expired.',
    statusCode: 400
  },
  RENEWAL_ALREADY_EXISTS: {
    code: 'RENEWAL_ALREADY_EXISTS',
    message: 'An active renewal request already exists for this lease.',
    statusCode: 400
  },
  UNAUTHORIZED_RENEWAL: {
    code: 'UNAUTHORIZED_RENEWAL',
    message: 'Access denied: You are not authorized to access this renewal request.',
    statusCode: 403
  },
  LEASE_NOT_FOUND: {
    code: 'LEASE_NOT_FOUND',
    message: 'The specified lease record was not found.',
    statusCode: 404
  },
  INVALID_STATE_TRANSITION: {
    code: 'INVALID_STATE_TRANSITION',
    message: 'The requested status transition is not permitted.',
    statusCode: 400
  },
  OUTSTANDING_RENT_BALANCE: {
    code: 'OUTSTANDING_RENT_BALANCE',
    message: 'Lease renewal is blocked due to outstanding unpaid payments.',
    statusCode: 400
  },
  OPEN_MAINTENANCE_TICKETS: {
    code: 'OPEN_MAINTENANCE_TICKETS',
    message: 'Lease renewal is blocked due to open maintenance tickets.',
    statusCode: 400
  },
  INACTIVE_PROPERTY: {
    code: 'INACTIVE_PROPERTY',
    message: 'This operation is not allowed because the property or tenant is inactive.',
    statusCode: 400
  },
  CONCURRENT_UPDATE_REVISION: {
    code: 'CONCURRENT_UPDATE_REVISION',
    message: 'Conflict: This record has been updated by another user. Please refresh and try again.',
    statusCode: 409
  }
};
