import { logContextStore } from '../logging/logContext.js';
import logger from '../logging/logger.js';

/**
 * Middleware managing request-level context tracing.
 * Captures request IDs, execution times, and user roles dynamically.
 */
export const requestContextMiddleware = (req, res, next) => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const correlationId = req.headers['x-correlation-id'] || requestId;

  // Propagate to headers
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Correlation-Id', correlationId);

  req.requestId = requestId;
  req.correlationId = correlationId;

  // Extract route module for domain segment tracking
  let routeModule = 'system';
  if (req.path.startsWith('/api/v1/lease-renewals')) {
    routeModule = 'lease-renewal';
  } else if (req.path.startsWith('/api/auth')) {
    routeModule = 'auth';
  } else if (req.path.startsWith('/api/payments')) {
    routeModule = 'payments';
  }

  const contextData = {
    requestId,
    correlationId,
    userId: req.user?.userId || 'anonymous',
    organizationId: req.user?.organizationId || null,
    module: routeModule,
    action: req.method,
    tenantRole: req.user?.role || null,
    environment: process.env.NODE_ENV || 'development',
    requestStartTime: start
  };

  logContextStore.run(contextData, () => {
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      // Request performance logging levels: Warning >500ms, Error >2000ms
      if (duration > 2000) {
        logger.error(`SLOW REQUEST ERROR: ${req.method} ${req.path} - Completed with status ${res.statusCode} in ${duration}ms`);
      } else if (duration > 500) {
        logger.warn(`SLOW REQUEST WARNING: ${req.method} ${req.path} - Completed with status ${res.statusCode} in ${duration}ms`);
      } else {
        logger.info(`HttpRequest: ${req.method} ${req.path} - ${res.statusCode}`);
      }
    });

    next();
  });
};
