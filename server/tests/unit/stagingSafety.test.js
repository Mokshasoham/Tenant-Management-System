import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { AppError } from '../../src/utils/errorHandling.js';
import {
  isMockPaymentsEnabled,
  getRazorpayClient,
  createMockRentOrder,
  createMockBookingOrder,
  createMockSubscriptionOrder,
  createMockMaintenanceOrder,
  generateMockSignature,
  verifyMockSignature,
  verifyMockPayment,
  executeMockRefund,
} from '../../src/services/paymentGatewayService.js';
import {
  resolveApiBaseUrl,
  resolveSocketUrl,
  resolveMediaBaseUrl,
  isStagingEnvironment,
  validateStagingUrl,
  PRODUCTION_BACKEND_HOST,
} from '../../../client/src/utils/envConfig.js';
import { createSetupIntent, verifyAndEnableAutoPay } from '../../src/controllers/autoPayController.js';
import { lookupIfscDetails } from '../../src/controllers/payoutController.js';

describe('TMS Staging Safety & Mock Payments Enforcement Test Suite', () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = origEnv;
  });

  describe('1. Mock Mode SDK & Client Instantiation Guard', () => {
    it('1.1 should identify mock mode enabled when ENABLE_MOCK_PAYMENTS=true', () => {
      process.env.ENABLE_MOCK_PAYMENTS = 'true';
      expect(isMockPaymentsEnabled()).toBe(true);
    });

    it('1.2 should identify mock mode disabled when ENABLE_MOCK_PAYMENTS=false or unset', () => {
      process.env.ENABLE_MOCK_PAYMENTS = 'false';
      expect(isMockPaymentsEnabled()).toBe(false);
      delete process.env.ENABLE_MOCK_PAYMENTS;
      expect(isMockPaymentsEnabled()).toBe(false);
    });

    it('1.3 should strictly block getRazorpayClient() and throw 400 when mock payments are enabled', () => {
      process.env.ENABLE_MOCK_PAYMENTS = 'true';
      expect(() => getRazorpayClient()).toThrow(
        /Live payment gateway client creation is strictly blocked when ENABLE_MOCK_PAYMENTS is enabled/
      );
    });
  });

  describe('2. Server Mock Payment Order Creation', () => {
    beforeEach(() => {
      process.env.ENABLE_MOCK_PAYMENTS = 'true';
    });

    it('2.1 should create mock rent order with deterministic prefix, receipt, and isMock flag', () => {
      const leaseId = new mongoose.Types.ObjectId();
      const order = createMockRentOrder({
        leaseId,
        amountInPaise: 1515000,
        notes: { tenantEmail: 'tenant@test.local' },
      });

      expect(order.id).toMatch(/^order_mock_/);
      expect(order.amount).toBe(1515000);
      expect(order.currency).toBe('INR');
      expect(order.isMock).toBe(true);
      expect(order.receipt).toContain(String(leaseId).slice(-8));
    });

    it('2.2 should create mock booking order with deterministic prefix and isMock flag', () => {
      const bookingId = new mongoose.Types.ObjectId();
      const order = createMockBookingOrder({
        bookingId,
        amountInPaise: 500000,
        notes: { propertyName: 'Skyline Penthouse' },
      });

      expect(order.id).toMatch(/^order_mock_bk_/);
      expect(order.amount).toBe(500000);
      expect(order.currency).toBe('INR');
      expect(order.isMock).toBe(true);
      expect(order.receipt).toContain(String(bookingId).slice(-8));
    });

    it('2.3 should create mock subscription order with deterministic prefix and isMock flag', () => {
      const managerId = new mongoose.Types.ObjectId();
      const order = createMockSubscriptionOrder({
        userId: managerId,
        planId: 'plan_growth',
        billingCycle: 'monthly',
        amountInPaise: 299900,
        notes: { planName: 'Enterprise Growth' },
      });

      expect(order.id).toMatch(/^order_mock_sub_/);
      expect(order.amount).toBe(299900);
      expect(order.currency).toBe('INR');
      expect(order.isMock).toBe(true);
      expect(order.notes.planName).toBe('Enterprise Growth');
    });

    it('2.4 should create mock maintenance unlock order with deterministic prefix and isMock flag', () => {
      const leaseId = new mongoose.Types.ObjectId();
      const order = createMockMaintenanceOrder({
        leaseId,
        amountInPaise: 50000,
      });

      expect(order.id).toMatch(/^order_mock_maint_/);
      expect(order.amount).toBe(50000);
      expect(order.currency).toBe('INR');
      expect(order.isMock).toBe(true);
    });
  });

  describe('3. Deterministic Mock Signature & Payment Verification', () => {
    beforeEach(() => {
      process.env.ENABLE_MOCK_PAYMENTS = 'true';
    });

    it('3.1 should generate and verify deterministic mock signatures accurately', () => {
      const orderId = 'order_mock_rent_abc123456789';
      const paymentId = 'pay_mock_987654321xyz';

      const validSig = generateMockSignature(orderId, paymentId);
      expect(validSig).toMatch(/^mock_sig_/);
      expect(verifyMockSignature(orderId, paymentId, validSig)).toBe(true);

      const invalidSig = 'mock_sig_tampered_signature_payload';
      expect(verifyMockSignature(orderId, paymentId, invalidSig)).toBe(false);
      expect(verifyMockSignature(orderId, paymentId, '')).toBe(false);
      expect(verifyMockSignature(orderId, paymentId, null)).toBe(false);
    });

    it('3.2 should construct verified payment entity based on authoritative server values', () => {
      const orderId = 'order_mock_rent_test_1';
      const paymentId = 'pay_mock_rent_test_1';

      const entity = verifyMockPayment({
        orderId,
        paymentId,
        expectedAmountPaise: 1515000,
        expectedCurrency: 'INR',
      });

      expect(entity.id).toBe(paymentId);
      expect(entity.order_id).toBe(orderId);
      expect(entity.amount).toBe(1515000);
      expect(entity.status).toBe('captured');
      expect(entity.isMock).toBe(true);
    });

    it('3.3 should reject verifyMockPayment if called when mock mode is disabled', () => {
      process.env.ENABLE_MOCK_PAYMENTS = 'false';
      expect(() =>
        verifyMockPayment({
          orderId: 'order_mock_1',
          paymentId: 'pay_mock_1',
          expectedAmountPaise: 1000,
        })
      ).toThrow(/ENABLE_MOCK_PAYMENTS is disabled/);
    });

    it('3.4 should reject non-mock format identifiers in verifyMockPayment', () => {
      expect(() =>
        verifyMockPayment({
          orderId: 'live_gateway_order_xyz',
          paymentId: 'pay_mock_123',
          expectedAmountPaise: 1000,
        })
      ).toThrow(/Invalid mock order ID format/);

      expect(() =>
        verifyMockPayment({
          orderId: 'order_mock_123',
          paymentId: 'live_gateway_pay_xyz',
          expectedAmountPaise: 1000,
        })
      ).toThrow(/Invalid mock payment ID format/);
    });
  });

  describe('4. Mock Refund Execution & Safeguards', () => {
    beforeEach(() => {
      process.env.ENABLE_MOCK_PAYMENTS = 'true';
    });

    it('4.1 should execute mock refund offline and return processed outcome', async () => {
      const result = await executeMockRefund({
        payment: { isMock: true, _id: new mongoose.Types.ObjectId() },
        refundAmount: 500,
        reason: 'Security deposit release',
      });

      expect(result.id).toMatch(/^rfnd_mock_/);
      expect(result.status).toBe('processed');
      expect(result.amount).toBe(50000);
      expect(result.currency).toBe('INR');
      expect(result.isMock).toBe(true);
    });
  });

  describe('5. Unsupported Mock Workflows Fail Closed', () => {
    beforeEach(() => {
      process.env.ENABLE_MOCK_PAYMENTS = 'true';
    });

    it('5.1 createSetupIntent should fail closed with HTTP 400 in mock mode', async () => {
      const req = {
        user: { userId: new mongoose.Types.ObjectId(), role: 'tenant' },
        body: { leaseId: new mongoose.Types.ObjectId() },
      };
      const res = {};

      await expect(createSetupIntent(req, res)).rejects.toThrow(
        /Auto-Pay recurring mandate configuration is not supported in staging mock-payment mode/
      );
    });

    it('5.2 verifyAndEnableAutoPay should fail closed with HTTP 400 in mock mode', async () => {
      const req = {
        user: { userId: new mongoose.Types.ObjectId(), role: 'tenant' },
        body: { autoPayId: new mongoose.Types.ObjectId() },
      };
      const res = {};

      await expect(verifyAndEnableAutoPay(req, res)).rejects.toThrow(
        /Recurring payment mandate verification is not supported in staging mock-payment mode/
      );
    });
  });

  describe('6. Hardcoded Fallback Credentials Removal & Missing Key Fail-Closed', () => {
    it('6.1 should throw 503 when RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing and mock mode is off', () => {
      process.env.ENABLE_MOCK_PAYMENTS = 'false';
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;

      expect(() => getRazorpayClient()).toThrow(
        /Razorpay payment gateway credentials not configured/
      );
    });

    it('6.2 should strictly reject ENABLE_MOCK_PAYMENTS=true at startup when NODE_ENV=production and APP_ENV=production', async () => {
      const { validateEnv } = await import('../../src/platform/config/validateEnv.js');
      process.env.APP_ENV = 'production';
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_MOCK_PAYMENTS = 'true';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
      process.env.JWT_SECRET = 'test_super_secret_jwt_key_that_is_long_enough_12345';

      expect(() => validateEnv()).toThrow(
        /ENABLE_MOCK_PAYMENTS cannot be enabled in live production/
      );
    });

    it('6.3 should permit ENABLE_MOCK_PAYMENTS=true when NODE_ENV=production and APP_ENV=staging while strictly blocking live gateway calls', async () => {
      const { validateEnv } = await import('../../src/platform/config/validateEnv.js');
      process.env.APP_ENV = 'staging';
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_MOCK_PAYMENTS = 'true';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test-staging';
      process.env.JWT_SECRET = 'test_super_secret_jwt_key_that_is_long_enough_12345';
      process.env.EMAIL_ENABLED = 'false';

      expect(() => validateEnv()).not.toThrow();
      expect(isMockPaymentsEnabled()).toBe(true);
      expect(() => getRazorpayClient()).toThrow(
        /Live payment gateway client creation is strictly blocked when ENABLE_MOCK_PAYMENTS is enabled/
      );
    });
  });

  describe('7. Payouts & IFSC Isolation in Mock Mode', () => {
    beforeEach(() => {
      process.env.ENABLE_MOCK_PAYMENTS = 'true';
    });

    it('7.1 lookupIfscDetails should resolve valid IFSC offline without network fetch', async () => {
      const ifscResult = await lookupIfscDetails('HDFC0000001');
      expect(ifscResult.valid).toBe(true);
      expect(ifscResult.bankName).toBe('HDFC Bank');
      expect(ifscResult.branch).toBe('Staging Main Branch');
      expect(ifscResult.ifsc).toBe('HDFC0000001');
    });

    it('7.2 lookupIfscDetails should mark invalid IFSC format as invalid offline', async () => {
      const ifscResult = await lookupIfscDetails('INVALID_IFSC');
      expect(ifscResult.valid).toBe(false);
    });
  });

  describe('8. Frontend Staging Isolation: Missing Staging URL Fails Closed', () => {
    it('8.1 should throw StagingSafetyError when VITE_API_BASE_URL is missing in staging mode', () => {
      const env = { VITE_APP_ENV: 'staging' };
      const hostname = 'staging.d3abcdefg.amplifyapp.com';

      expect(() => resolveApiBaseUrl({ env, hostname })).toThrow(
        /\[StagingSafetyError\] Staging configuration requires an explicit VITE_API_BASE_URL/
      );
    });

    it('8.2 should throw StagingSafetyError when VITE_API_BASE_URL is whitespace or empty in staging', () => {
      const env = { VITE_APP_ENV: 'staging', VITE_API_BASE_URL: '   ' };
      expect(() => resolveApiBaseUrl({ env, hostname: 'staging-app.com' })).toThrow(
        /\[StagingSafetyError\] Staging configuration requires an explicit VITE_API_BASE_URL/
      );
    });
  });

  describe('9. Frontend Staging Isolation: Production URL Fallback Prohibited', () => {
    it('9.1 should throw StagingSafetyError when staging URL points to production backend host', () => {
      const env = {
        VITE_APP_ENV: 'staging',
        VITE_API_BASE_URL: `https://${PRODUCTION_BACKEND_HOST}/api`,
      };
      const hostname = 'staging.tms.com';

      expect(() => resolveApiBaseUrl({ env, hostname })).toThrow(
        /\[StagingSafetyError\] Unsafe staging configuration: VITE_API_BASE_URL points to production backend/
      );
    });

    it('9.2 should throw StagingSafetyError when staging URL has an invalid protocol or is malformed', () => {
      const env = {
        VITE_APP_ENV: 'staging',
        VITE_API_BASE_URL: 'ftp://staging-backend.onrender.com/api',
      };
      expect(() => resolveApiBaseUrl({ env, hostname: 'staging.tms.com' })).toThrow(
        /\[StagingSafetyError\] Invalid protocol in VITE_API_BASE_URL/
      );

      const malformedEnv = {
        VITE_APP_ENV: 'staging',
        VITE_API_BASE_URL: 'not-a-valid-url',
      };
      expect(() => resolveApiBaseUrl({ env: malformedEnv, hostname: 'staging.tms.com' })).toThrow(
        /\[StagingSafetyError\] Malformed staging VITE_API_BASE_URL/
      );
    });
  });

  describe('10. Client URL Resolution & Protocols', () => {
    it('10.1 should correctly resolve valid staging API, WebSocket, and media base URLs', () => {
      const stagingBackend = 'https://tenant-management-backend-staging.onrender.com';
      const env = {
        VITE_APP_ENV: 'staging',
        VITE_API_BASE_URL: `${stagingBackend}/api/`,
      };
      const hostname = 'staging.d3abcdefg.amplifyapp.com';

      const apiUrl = resolveApiBaseUrl({ env, hostname });
      expect(apiUrl).toBe(`${stagingBackend}/api`);

      const socketUrl = resolveSocketUrl({ env, hostname });
      expect(socketUrl).toBe(stagingBackend);

      const mediaUrl = resolveMediaBaseUrl({ env, hostname });
      expect(mediaUrl).toBe(stagingBackend);
    });

    it('10.2 should resolve localhost default during local development', () => {
      const env = {};
      const hostname = 'localhost';

      expect(resolveApiBaseUrl({ env, hostname })).toBe('http://localhost:5000/api');
      expect(resolveSocketUrl({ env, hostname })).toBe('http://localhost:5000');
      expect(resolveMediaBaseUrl({ env, hostname })).toBe('http://localhost:5000');
    });

    it('10.3 should resolve production fallback for deployed production web client', () => {
      const env = { VITE_APP_ENV: 'production' };
      const hostname = 'app.tms.com';

      expect(resolveApiBaseUrl({ env, hostname })).toBe(
        `https://${PRODUCTION_BACKEND_HOST}/api`
      );
      expect(resolveSocketUrl({ env, hostname })).toBe(
        `https://${PRODUCTION_BACKEND_HOST}`
      );
    });

    it('10.4 should ensure resolveApiBaseUrl, resolveSocketUrl, and resolveMediaBaseUrl all fail closed together if staging config points to production', () => {
      const unsafeEnv = {
        VITE_APP_ENV: 'staging',
        VITE_API_BASE_URL: `https://${PRODUCTION_BACKEND_HOST}/api`,
      };
      const hostname = 'staging.amplifyapp.com';

      expect(() => resolveApiBaseUrl({ env: unsafeEnv, hostname })).toThrow(/Unsafe staging configuration/);
      expect(() => resolveSocketUrl({ env: unsafeEnv, hostname })).toThrow(/Unsafe staging configuration/);
      expect(() => resolveMediaBaseUrl({ env: unsafeEnv, hostname })).toThrow(/Unsafe staging configuration/);
    });

    it('10.5 should ensure resolveApiBaseUrl, resolveSocketUrl, and resolveMediaBaseUrl all fail closed together if staging config is absent', () => {
      const absentEnv = {
        VITE_APP_ENV: 'staging',
      };
      const hostname = 'staging.amplifyapp.com';

      expect(() => resolveApiBaseUrl({ env: absentEnv, hostname })).toThrow(/requires an explicit VITE_API_BASE_URL/);
      expect(() => resolveSocketUrl({ env: absentEnv, hostname })).toThrow(/requires an explicit VITE_API_BASE_URL/);
      expect(() => resolveMediaBaseUrl({ env: absentEnv, hostname })).toThrow(/requires an explicit VITE_API_BASE_URL/);
    });
  });
});
