/**
 * src/platform/auth/systemPrincipal.js
 *
 * Provides a standardized System Principal for background jobs, schedulers,
 * automated migrations, and system-level operations.
 */

export const SYSTEM_USER_ID = '000000000000000000000000';

/**
 * Construct a structured SystemPrincipal actor object.
 * @param {object} [options]
 * @param {string} [options.source]         - Origin of action ('scheduler', 'migration', 'import', 'ai', 'system')
 * @param {string} [options.requestId]      - Execution / Request ID for tracing
 * @param {string} [options.correlationId]  - Batch / Correlation ID across multi-record operations
 * @returns {object} Standardized actor object
 */
export const createSystemPrincipal = ({ source = 'scheduler', requestId = null, correlationId = null } = {}) => ({
  id: SYSTEM_USER_ID,
  userId: SYSTEM_USER_ID, // Backward compatibility
  type: 'SYSTEM',
  source,
  requestId,
  correlationId
});
