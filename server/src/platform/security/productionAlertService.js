import logger from '../logging/logger.js';
import config from '../../config/config.js';

export const ALERT_SEVERITY = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

export const ALERT_TYPES = {
  HIGH_FRAUD_RISK: 'HIGH_FRAUD_RISK',
  SANCTION_MATCH: 'SANCTION_MATCH',
  CONSECUTIVE_FAILURES: 'CONSECUTIVE_FAILURES',
  CIRCUIT_BREAKER_TRIPPED: 'CIRCUIT_BREAKER_TRIPPED',
  PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  LEDGER_INTEGRITY_BREACH: 'LEDGER_INTEGRITY_BREACH',
};

class ProductionAlertServiceClass {
  constructor() {
    this.webhookUrl = process.env.SECURITY_ALERT_WEBHOOK_URL || config.SECURITY_ALERT_WEBHOOK_URL || null;
    this.alertBuffer = [];
    this.maxBufferSize = 100;
  }

  /**
   * Mask or hash sensitive strings for safe alert logs/webhooks.
   */
  sanitizePayload(data = {}) {
    if (!data || typeof data !== 'object') return {};

    const sanitized = { ...data };

    // Mask common sensitive fields
    const sensitiveKeys = ['aadhaarNumber', 'maskedAadhaar', 'panNumber', 'maskedPan', 'gstin', 'maskedGstin', 'email', 'phone', 'fullName', 'name'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.includes(key) && typeof sanitized[key] === 'string') {
        const val = sanitized[key];
        if (val.length <= 4) {
          sanitized[key] = '***';
        } else {
          sanitized[key] = val.substring(0, 2) + '****' + val.substring(val.length - 2);
        }
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizePayload(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Dispatch a production security or operational alert.
   * @param {Object} alertSpec
   * @param {string} alertSpec.type - ALERT_TYPES
   * @param {string} alertSpec.severity - ALERT_SEVERITY
   * @param {string} alertSpec.verificationId - ID of related verification
   * @param {string} alertSpec.message - Human readable description
   * @param {Object} [alertSpec.details] - Context data (will be sanitized)
   */
  async dispatchAlert({ type, severity = ALERT_SEVERITY.WARNING, verificationId = null, message, details = {} }) {
    const sanitizedDetails = this.sanitizePayload(details);

    const alertEvent = {
      alertId: `ALT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      type,
      severity,
      verificationId,
      message,
      details: sanitizedDetails,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
    };

    // 1. Buffer locally
    this.alertBuffer.unshift(alertEvent);
    if (this.alertBuffer.length > this.maxBufferSize) {
      this.alertBuffer.pop();
    }

    // 2. Structured log output
    const logPrefix = `[PRODUCTION_ALERT:${severity}][${type}]`;
    if (severity === ALERT_SEVERITY.CRITICAL || severity === ALERT_SEVERITY.HIGH) {
      logger.error(`${logPrefix} ${message} (Verification: ${verificationId})`, { alertEvent });
    } else {
      logger.warn(`${logPrefix} ${message} (Verification: ${verificationId})`, { alertEvent });
    }

    // 3. Dispatch to Webhook if configured
    if (this.webhookUrl) {
      this._sendWebhook(alertEvent).catch((err) => {
        logger.error(`[ProductionAlertService] Failed to deliver alert webhook: ${err.message}`);
      });
    }

    return alertEvent;
  }

  async _sendWebhook(alertEvent) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TenantManagement-SecurityAlert/1.0',
        },
        body: JSON.stringify(alertEvent),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        logger.warn(`[ProductionAlertService] Webhook endpoint responded with HTTP ${res.status}`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  /**
   * Retrieve recent alerts for admin diagnostic dashboard.
   */
  getRecentAlerts(limit = 20) {
    return this.alertBuffer.slice(0, limit);
  }
}

export const productionAlertService = new ProductionAlertServiceClass();
export default productionAlertService;
