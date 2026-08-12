import { jest } from '@jest/globals';
import {
  CircuitBreaker,
  CircuitBreakerRegistry,
  CIRCUIT_STATES,
} from '../../../src/platform/security/circuitBreaker.js';
import productionAlertService, {
  ALERT_TYPES,
  ALERT_SEVERITY,
} from '../../../src/platform/security/productionAlertService.js';
import getVerificationHealthDiagnostics from '../../../src/platform/security/verificationHealthDiagnostic.js';
import {
  globalVerificationLimiter,
  sensitiveVerificationLimiter,
  governmentOtpLimiter,
  adminVerificationLimiter,
} from '../../../src/middleware/verificationRateLimiter.js';

describe('Phase 3.6.8 Production Hardening Test Suite', () => {

  describe('1. Rate Limiting Middleware Suite', () => {
    it('should export all 4 rate limiters as functions', () => {
      expect(typeof globalVerificationLimiter).toBe('function');
      expect(typeof sensitiveVerificationLimiter).toBe('function');
      expect(typeof governmentOtpLimiter).toBe('function');
      expect(typeof adminVerificationLimiter).toBe('function');
    });

    it('should call next() for standard request under limit', (done) => {
      const mockReq = {
        ip: '127.0.0.1',
        headers: {},
        user: { id: 'test-user-1' },
      };
      const mockRes = {
        setHeader: () => {},
        status: () => mockRes,
        json: () => {},
      };

      globalVerificationLimiter(mockReq, mockRes, (err) => {
        expect(err).toBeUndefined();
        done();
      });
    });
  });

  describe('2. Circuit Breaker Utility Suite', () => {
    let cb;

    beforeEach(() => {
      cb = new CircuitBreaker('TEST_PROVIDER', {
        failureThreshold: 3,
        recoveryWindowMs: 1000,
        maxHalfOpenTrials: 1,
      });
    });

    it('should initialize in CLOSED state', () => {
      expect(cb.state).toBe(CIRCUIT_STATES.CLOSED);
      expect(cb.consecutiveFailures).toBe(0);
    });

    it('should execute successfully when CLOSED', async () => {
      const result = await cb.execute(async () => 'OK_RESPONSE');
      expect(result).toBe('OK_RESPONSE');
      expect(cb.consecutiveFailures).toBe(0);
    });

    it('should increment failures and trip to OPEN after reaching threshold', async () => {
      const failingFn = async () => {
        throw new Error('API Provider Unavailable 503');
      };

      // 1st failure
      try { await cb.execute(failingFn); } catch (e) {}
      expect(cb.consecutiveFailures).toBe(1);
      expect(cb.state).toBe(CIRCUIT_STATES.CLOSED);

      // 2nd failure
      try { await cb.execute(failingFn); } catch (e) {}
      expect(cb.consecutiveFailures).toBe(2);
      expect(cb.state).toBe(CIRCUIT_STATES.CLOSED);

      // 3rd failure -> trips to OPEN
      try { await cb.execute(failingFn); } catch (e) {}
      expect(cb.consecutiveFailures).toBe(3);
      expect(cb.getState()).toBe(CIRCUIT_STATES.OPEN);
    });

    it('should fail-fast immediately when OPEN without calling action', async () => {
      cb.state = CIRCUIT_STATES.OPEN;
      cb.lastFailureTime = Date.now();

      let called = false;
      const actionFn = async () => {
        called = true;
        return 'SHOULD_NOT_EXECUTE';
      };

      try {
        await cb.execute(actionFn);
        throw new Error('Should have failed');
      } catch (err) {
        expect(err.message).toContain('Circuit breaker for TEST_PROVIDER is OPEN');
        expect(called).toBe(false);
      }
    });

    it('should transition to HALF_OPEN after recoveryWindowMs expires', async () => {
      cb.state = CIRCUIT_STATES.OPEN;
      cb.lastFailureTime = Date.now() - 1500; // 1.5s ago (> 1s recovery window)

      const successFn = async () => 'SUCCESS_AFTER_RECOVERY';

      const result = await cb.execute(successFn);
      expect(result).toBe('SUCCESS_AFTER_RECOVERY');
      expect(cb.state).toBe(CIRCUIT_STATES.CLOSED);
      expect(cb.consecutiveFailures).toBe(0);
    });

    it('should reset state manually via reset()', () => {
      cb.state = CIRCUIT_STATES.OPEN;
      cb.consecutiveFailures = 5;
      cb.reset();

      expect(cb.state).toBe(CIRCUIT_STATES.CLOSED);
      expect(cb.consecutiveFailures).toBe(0);
    });

    it('should manage breakers in CircuitBreakerRegistry singleton', () => {
      const breaker1 = CircuitBreakerRegistry.get('PROVIDER_A', { failureThreshold: 5 });
      const breaker2 = CircuitBreakerRegistry.get('PROVIDER_A');
      expect(breaker1).toBe(breaker2);

      const states = CircuitBreakerRegistry.getAllStates();
      expect(states).toHaveProperty('PROVIDER_A');
    });
  });

  describe('3. Production Alert Service Suite', () => {
    it('should buffer and format alert events correctly', async () => {
      const alert = await productionAlertService.dispatchAlert({
        type: ALERT_TYPES.HIGH_FRAUD_RISK,
        severity: ALERT_SEVERITY.HIGH,
        verificationId: 'VER-999',
        message: 'Suspicious device fingerprint detected',
        details: { riskScore: 88, deviceId: 'DEV-123' },
      });

      expect(alert).toHaveProperty('alertId');
      expect(alert.type).toBe(ALERT_TYPES.HIGH_FRAUD_RISK);
      expect(alert.severity).toBe(ALERT_SEVERITY.HIGH);
      expect(alert.verificationId).toBe('VER-999');

      const recent = productionAlertService.getRecentAlerts(5);
      expect(recent.some(a => a.alertId === alert.alertId)).toBe(true);
    });

    it('should sanitize PII in alert payload details', async () => {
      const alert = await productionAlertService.dispatchAlert({
        type: ALERT_TYPES.SANCTION_MATCH,
        severity: ALERT_SEVERITY.CRITICAL,
        verificationId: 'VER-888',
        message: 'Sanction list match confirmed',
        details: {
          aadhaarNumber: '999988887777',
          panNumber: 'ABCDE1234F',
          email: 'john.doe@example.com',
          phone: '+919876543210',
          fullName: 'John Doe',
        },
      });

      expect(alert.details.aadhaarNumber).toBe('99****77');
      expect(alert.details.panNumber).toBe('AB****4F');
      expect(alert.details.email).toBe('jo****om');
      expect(alert.details.phone).toBe('+9****10');
      expect(alert.details.fullName).toBe('Jo****oe');
    });
  });

  describe('4. Environment & Health Diagnostic Tool Suite', () => {
    it('should return complete structured diagnostic object', () => {
      const diag = getVerificationHealthDiagnostics();

      expect(diag).toHaveProperty('timestamp');
      expect(diag).toHaveProperty('environment');
      expect(diag).toHaveProperty('activeModes');
      expect(diag).toHaveProperty('credentialPresence');
      expect(diag).toHaveProperty('readiness');
      expect(diag).toHaveProperty('circuitBreakers');
      expect(diag).toHaveProperty('recentAlerts');

      // Verify active modes has all 10 verification features
      const requiredFeatures = [
        'identity', 'property', 'digilocker', 'aadhaar',
        'pan', 'gst', 'facial', 'videoKyc', 'fraud', 'sanction'
      ];

      for (const feat of requiredFeatures) {
        expect(diag.activeModes).toHaveProperty(feat);
        expect(diag.credentialPresence).toHaveProperty(feat);
        expect(diag.readiness).toHaveProperty(feat);
      }

      // Verify no sensitive keys exposed
      const jsonString = JSON.stringify(diag);
      expect(jsonString).not.toContain('secret');
      expect(jsonString).not.toContain('password');
    });
  });

});
