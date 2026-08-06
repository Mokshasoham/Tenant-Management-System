/**
 * server/tests/unit/telemetry/telemetryService.test.js
 *
 * Unit Test Suite for Phase 2.3.4.3 — Observability, HTTP Telemetry & EventBus Metrics.
 */

import telemetryService from '../../../src/platform/telemetry/telemetryService.js';
import telemetryMiddleware from '../../../src/platform/telemetry/telemetryMiddleware.js';
import eventBus from '../../../src/platform/events/eventBus.js';

describe('Phase 2.3.4.3 — Observability & Telemetry Unit Tests', () => {

  // ─────────────────────────────────────────────────────────────
  // 1. HTTP TELEMETRY & MIDDLEWARE
  // ─────────────────────────────────────────────────────────────
  describe('HTTP Telemetry & Middleware', () => {
    test('telemetryMiddleware tracks active requests and records status codes', (done) => {
      const req = {};
      const listeners = {};
      const res = {
        statusCode: 200,
        on: (event, handler) => {
          listeners[event] = handler;
        }
      };

      telemetryMiddleware(req, res, () => {
        expect(telemetryService.httpMetrics.totalRequests).toBeGreaterThan(0);
        // Simulate response finish
        if (listeners['finish']) listeners['finish']();

        const report = telemetryService.getTelemetryReport();
        expect(report.success).toBe(true);
        expect(report.http.statusCounts['2xx']).toBeGreaterThan(0);
        expect(report.http.averageDurationMs).toBeGreaterThanOrEqual(0);
        done();
      });
    });

    test('recordHttpRequest categorizes 2xx, 4xx, and 5xx status codes', () => {
      telemetryService.recordHttpRequest(201, 10);
      telemetryService.recordHttpRequest(404, 15);
      telemetryService.recordHttpRequest(500, 50);

      const report = telemetryService.getTelemetryReport();
      expect(report.http.statusCounts['2xx']).toBeGreaterThan(0);
      expect(report.http.statusCounts['4xx']).toBeGreaterThan(0);
      expect(report.http.statusCounts['5xx']).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. PROCESS MEMORY TELEMETRY
  // ─────────────────────────────────────────────────────────────
  describe('Process Memory Metrics', () => {
    test('getTelemetryReport includes Node.js process memory metrics', () => {
      const report = telemetryService.getTelemetryReport();

      expect(report.process.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(report.process.memory.heapUsedMb).toBeGreaterThan(0);
      expect(report.process.memory.rssMb).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. EVENTBUS & END-TO-END QUEUE PROCESSING METRICS
  // ─────────────────────────────────────────────────────────────
  describe('EventBus & End-to-End Metrics', () => {
    test('EventBus publication triggers telemetry counters and End-to-End queue processing metrics', async () => {
      const enqueuedAt = new Date(Date.now() - 250).toISOString();
      await eventBus.publish('telemetry.test.event', { enqueuedAt });

      // Wait for async EventBus handler tick
      await new Promise((r) => setTimeout(r, 50));

      const report = telemetryService.getTelemetryReport();
      expect(report.eventBus.publishedTotal).toBeGreaterThan(0);
      expect(report.eventBus.topicBreakdown['telemetry.test.event']).toBeGreaterThan(0);
      expect(report.endToEndQueue.totalProcessed).toBeGreaterThan(0);
      expect(report.endToEndQueue.averageProcessingTimeMs).toBeGreaterThanOrEqual(200);
    });
  });

});
