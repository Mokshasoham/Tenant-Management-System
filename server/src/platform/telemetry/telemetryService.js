/**
 * server/src/platform/telemetry/telemetryService.js
 *
 * Central Telemetry Service.
 * Aggregates runtime memory, HTTP latency/status counters, EventBus publication rates,
 * and End-to-End Queue Processing Time (Business Event -> Queue -> Worker -> Sent).
 */

import eventBus from '../events/eventBus.js';

export class TelemetryService {
  constructor() {
    this.httpMetrics = {
      totalRequests: 0,
      activeRequests: 0,
      status2xx: 0,
      status4xx: 0,
      status5xx: 0,
      totalDurationMs: 0
    };

    this.eventMetrics = {
      publishedCount: 0,
      topicCounts: {}
    };

    this.queueProcessingMetrics = {
      totalProcessed: 0,
      totalDurationMs: 0,
      averageProcessingTimeMs: 0
    };

    this._subscribeToEventBus();
  }

  /**
   * Listens to EventBus events to track publication metrics and End-to-End queue times.
   */
  _subscribeToEventBus() {
    eventBus.subscribe('*', (payload, topic = 'unknown') => {
      this.eventMetrics.publishedCount++;
      this.eventMetrics.topicCounts[topic] = (this.eventMetrics.topicCounts[topic] || 0) + 1;

      // Track End-to-End queue processing time if event contains created/enqueued timestamp
      if (payload?.enqueuedAt || payload?.occurredAt) {
        const startTime = new Date(payload.enqueuedAt || payload.occurredAt).getTime();
        const duration = Date.now() - startTime;
        if (duration > 0 && duration < 86400000) { // filter anomalies
          this.queueProcessingMetrics.totalProcessed++;
          this.queueProcessingMetrics.totalDurationMs += duration;
          this.queueProcessingMetrics.averageProcessingTimeMs = Math.round(
            this.queueProcessingMetrics.totalDurationMs / this.queueProcessingMetrics.totalProcessed
          );
        }
      }
    });
  }

  incrementActiveRequests() {
    this.httpMetrics.activeRequests++;
    this.httpMetrics.totalRequests++;
  }

  decrementActiveRequests() {
    this.httpMetrics.activeRequests = Math.max(0, this.httpMetrics.activeRequests - 1);
  }

  recordHttpRequest(statusCode, durationMs) {
    this.httpMetrics.totalDurationMs += durationMs;

    if (statusCode >= 200 && statusCode < 400) this.httpMetrics.status2xx++;
    else if (statusCode >= 400 && statusCode < 500) this.httpMetrics.status4xx++;
    else if (statusCode >= 500) this.httpMetrics.status5xx++;
  }

  /**
   * Returns a complete non-intrusive system observability telemetry report.
   */
  getTelemetryReport() {
    const memory = process.memoryUsage();
    const avgHttpDurationMs = this.httpMetrics.totalRequests > 0
      ? Math.round((this.httpMetrics.totalDurationMs / this.httpMetrics.totalRequests) * 100) / 100
      : 0;

    return {
      success: true,
      timestamp: new Date().toISOString(),
      process: {
        uptimeSeconds: Math.floor(process.uptime()),
        memory: {
          rssMb: Math.round((memory.rss / (1024 * 1024)) * 100) / 100,
          heapTotalMb: Math.round((memory.heapTotal / (1024 * 1024)) * 100) / 100,
          heapUsedMb: Math.round((memory.heapUsed / (1024 * 1024)) * 100) / 100,
          externalMb: Math.round((memory.external / (1024 * 1024)) * 100) / 100
        }
      },
      http: {
        totalRequests: this.httpMetrics.totalRequests,
        activeRequests: this.httpMetrics.activeRequests,
        averageDurationMs: avgHttpDurationMs,
        statusCounts: {
          '2xx': this.httpMetrics.status2xx,
          '4xx': this.httpMetrics.status4xx,
          '5xx': this.httpMetrics.status5xx
        }
      },
      eventBus: {
        publishedTotal: this.eventMetrics.publishedCount,
        topicBreakdown: this.eventMetrics.topicCounts
      },
      endToEndQueue: {
        totalProcessed: this.queueProcessingMetrics.totalProcessed,
        averageProcessingTimeMs: this.queueProcessingMetrics.averageProcessingTimeMs
      }
    };
  }
}

const telemetryServiceSingleton = new TelemetryService();
export default telemetryServiceSingleton;
