/**
 * server/src/platform/telemetry/telemetryMiddleware.js
 *
 * Express Middleware tracking HTTP request response times, status code counters,
 * and active HTTP request concurrency.
 */

import telemetryService from './telemetryService.js';

export function telemetryMiddleware(req, res, next) {
  const startTime = Date.now();
  telemetryService.incrementActiveRequests();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;

    telemetryService.recordHttpRequest(statusCode, durationMs);
    telemetryService.decrementActiveRequests();
  });

  next();
}

export default telemetryMiddleware;
