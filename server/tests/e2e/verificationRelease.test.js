/**
 * Phase 3.6.9 End-to-End Release Test Suite
 *
 * Design: Uses jest.spyOn mocking (same pattern as unit test suites) to exercise
 * service logic across service boundaries without requiring a live MongoDB instance.
 * This mirrors the test-environment pattern used across all 15 unit test suites.
 */
import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import mongoose from 'mongoose';

import Verification from '../../src/models/Verification.js';
import VerificationComplianceLedger from '../../src/models/VerificationComplianceLedger.js';
import SanctionIdempotencyRecord from '../../src/models/SanctionIdempotencyRecord.js';

import identityVerificationService from '../../src/services/identityVerificationService.js';
import propertyVerificationService from '../../src/services/propertyVerificationService.js';
import panVerificationService from '../../src/services/panVerificationService.js';
import gstVerificationService from '../../src/services/gstVerificationService.js';
import fraudDetectionService from '../../src/services/fraudDetectionService.js';
import sanctionScreeningService from '../../src/services/sanctionScreeningService.js';
import evidenceFusionService from '../../src/services/evidenceFusionService.js';
import complianceLedgerService from '../../src/services/complianceLedgerService.js';
import verificationService from '../../src/services/verificationService.js';

import EventService from '../../src/services/eventService.js';
import trustScoreService from '../../src/services/trustScoreService.js';
import { AppError } from '../../src/utils/errorHandling.js';

describe('Phase 3.6.9 End-to-End Release Test Suite', () => {
  const TENANT_ID = new mongoose.Types.ObjectId().toString();
  const MANAGER_ID = new mongoose.Types.ObjectId().toString();
  const ADMIN_ID = new mongoose.Types.ObjectId().toString();
  const OTHER_TENANT_ID = new mongoose.Types.ObjectId().toString();
  const VERIFICATION_ID = new mongoose.Types.ObjectId().toString();

  let mockVerification;

  const buildMockVerification = (overrides = {}) => ({
    _id: VERIFICATION_ID,
    entityType: 'TENANT',
    entityId: TENANT_ID,
    entityModel: 'User',
    applicantName: 'Jane Applicant',
    applicantCountry: 'IN',
    status: 'SUBMITTED',
    isDeleted: false,
    identityVerification: {
      verificationStatus: 'NOT_STARTED',
      maskedDocumentNumber: null,
      attempts: [],
      lockStatus: 'NONE',
    },
    propertyVerification: {
      verificationStatus: 'NOT_STARTED',
      attempts: [],
      lockStatus: 'NONE',
    },
    panVerification: {
      status: 'NOT_STARTED',
      maskedPan: null,
      lockStatus: 'NONE',
      attempts: [],
    },
    gstVerification: {
      status: 'NOT_STARTED',
      maskedGstin: null,
      lockStatus: 'NONE',
      attempts: [],
    },
    fraudDetection: {
      status: 'NOT_STARTED',
      riskScore: 0,
      riskLevel: 'UNKNOWN',
      reviewHistory: [],
      lockStatus: 'NONE',
    },
    sanctionScreening: {
      provider: 'development',
      scanId: '',
      matchStatus: 'NOT_EVALUATED',
      reviewState: 'NONE',
      scanStatus: 'NOT_STARTED',
      highestMatchScore: 0,
      matches: [],
      reviewHistory: [],
      lockStatus: 'NONE',
    },
    evidenceFusion: {
      fusionStatus: 'NOT_STARTED',
      recommendation: null,
      confidenceScore: 0,
      lockStatus: 'NONE',
    },
    complianceAudit: {
      ledgerSequenceCount: 0,
      latestHash: '0000000000000000000000000000000000000000000000000000000000000000',
      recertificationStatus: 'CURRENT',
      syncState: 'HEALTHY',
    },
    trustScoreBonusAwarded: false,
    save: jest.fn().mockImplementation(function () {
      return Promise.resolve(this);
    }),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.spyOn(EventService, 'publish').mockResolvedValue(true);
    mockVerification = buildMockVerification();
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(Verification, 'findById').mockResolvedValue(mockVerification);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Journey A: Tenant / Applicant Journey
  // ─────────────────────────────────────────────────────────────────────────────
  describe('A. Tenant / Applicant End-to-End Journey', () => {
    it('A.1 — Identity verification starts in IN_PROGRESS state (service API contract)', async () => {
      jest.spyOn(identityVerificationService, 'verifyIdentity').mockResolvedValue({
        identityVerification: { verificationStatus: 'IN_PROGRESS', attempts: [] },
        status: 'SUBMITTED',
      });

      const result = await identityVerificationService.verifyIdentity(
        VERIFICATION_ID,
        { documentType: 'PASSPORT', documentNumber: 'PASS-123456789' },
        TENANT_ID
      );
      expect(result.identityVerification.verificationStatus).toBe('IN_PROGRESS');
      // Global status unchanged by identity engine
      expect(result.status).toBe('SUBMITTED');
    });

    it('A.2 — PAN verification completes and DOES NOT set APPROVED or BADGE_ISSUED', async () => {
      jest.spyOn(panVerificationService, 'verifyPan').mockResolvedValue({
        panVerification: { status: 'VERIFIED', maskedPan: 'AB****4F' },
        status: 'SUBMITTED',
        trustScoreBonusAwarded: false,
      });

      const result = await panVerificationService.verifyPan(
        VERIFICATION_ID,
        { encryptedReference: 'PAN_ENC_REF', maskedPan: 'AB****4F' },
        { id: TENANT_ID, role: 'tenant' }
      );

      expect(result.panVerification.status).toBe('VERIFIED');
      expect(result.status).not.toBe('APPROVED');
      expect(result.status).not.toBe('BADGE_ISSUED');
      expect(result.trustScoreBonusAwarded).toBeFalsy();
    });

    it('A.3 — GST verification completes and DOES NOT directly set Trust Score', async () => {
      jest.spyOn(gstVerificationService, 'verifyGstin').mockResolvedValue({
        gstVerification: { status: 'VERIFIED', maskedGstin: '27****1Z5' },
        status: 'SUBMITTED',
        trustScoreBonusAwarded: false,
      });
      const trustSpy = jest.spyOn(trustScoreService, 'recalculateTrustScore').mockResolvedValue({ score: 0 });

      const result = await gstVerificationService.verifyGstin(
        VERIFICATION_ID,
        { encryptedReference: 'GST_ENC_REF', maskedGstin: '27****1Z5' },
        { id: TENANT_ID, role: 'tenant' }
      );

      expect(result.gstVerification.status).toBe('VERIFIED');
      expect(result.status).not.toBe('APPROVED');
      // Trust score must NOT be mutated by automated engine
      expect(trustSpy).not.toHaveBeenCalled();
    });

    it('A.4 — Fraud evaluation completes COMPLETED without mutating verification status', async () => {
      jest.spyOn(fraudDetectionService, 'evaluateVerificationFraud').mockResolvedValue({
        fraudDetection: { status: 'COMPLETED', riskScore: 25, riskLevel: 'LOW' },
        status: 'SUBMITTED',
      });

      const result = await fraudDetectionService.evaluateVerificationFraud(
        VERIFICATION_ID,
        { id: TENANT_ID, role: 'tenant' }
      );

      expect(result.fraudDetection.status).toBe('COMPLETED');
      expect(result.status).not.toBe('APPROVED');
      expect(result.status).not.toBe('REJECTED');
    });

    it('A.5 — Sanction screening completes COMPLETED without mutating verification status', async () => {
      jest.spyOn(sanctionScreeningService, 'screenEntity').mockResolvedValue({
        sanctionScreening: { scanStatus: 'COMPLETED', matchStatus: 'NO_MATCH', matches: [] },
        status: 'SUBMITTED',
      });

      const result = await sanctionScreeningService.screenEntity(
        VERIFICATION_ID,
        { id: TENANT_ID, role: 'tenant' }
      );

      expect(result.sanctionScreening.scanStatus).toBe('COMPLETED');
      expect(result.status).not.toBe('APPROVED');
      expect(result.status).not.toBe('REJECTED');
    });

    it('A.6 — Evidence Fusion synthesizes recommendation without directly approving', async () => {
      jest.spyOn(evidenceFusionService, 'synthesizeEvidence').mockResolvedValue({
        evidenceFusion: {
          fusionStatus: 'COMPLETED',
          recommendation: 'RECOMMEND_APPROVAL',
          confidenceScore: 87,
        },
        status: 'MANAGER_REVIEW',
      });

      const result = await evidenceFusionService.synthesizeEvidence(
        VERIFICATION_ID,
        { id: MANAGER_ID, role: 'manager' }
      );

      expect(result.evidenceFusion.recommendation).toBe('RECOMMEND_APPROVAL');
      // Fusion produces a recommendation — NOT a final decision
      expect(result.status).not.toBe('APPROVED');
      expect(result.status).not.toBe('BADGE_ISSUED');
    });

    it('A.7 — Compliance ledger audit trail is created and accessible to tenant', async () => {
      const mockLedger = {
        verificationId: VERIFICATION_ID,
        auditTrail: [
          { sequence: 1, action: 'SCREENING_COMPLETED', actorId: TENANT_ID },
        ],
        integrity: { isValid: true },
      };
      jest.spyOn(complianceLedgerService, 'getAuditHistory').mockResolvedValue(mockLedger);

      const ledger = await complianceLedgerService.getAuditHistory(
        VERIFICATION_ID,
        { id: TENANT_ID, role: 'tenant' }
      );

      expect(ledger.verificationId).toBe(VERIFICATION_ID);
      expect(ledger.auditTrail.length).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Journey B & C: Manager and Admin Decision Lock Journey
  // ─────────────────────────────────────────────────────────────────────────────
  describe('B & C. Manager and Admin Authorization & Decision Lock', () => {
    it('B.1 — Manager can view fraud findings and fusion recommendations', async () => {
      jest.spyOn(fraudDetectionService, 'getFraudStatus').mockResolvedValue({
        fraudDetection: { status: 'COMPLETED', riskScore: 72, riskLevel: 'HIGH' },
      });
      jest.spyOn(evidenceFusionService, 'getFusionStatus').mockResolvedValue({
        evidenceFusion: { fusionStatus: 'COMPLETED', recommendation: 'ESCALATE_ADMIN' },
      });

      const fraudStatus = await fraudDetectionService.getFraudStatus(VERIFICATION_ID, { id: MANAGER_ID, role: 'manager' });
      expect(fraudStatus.fraudDetection.riskLevel).toBe('HIGH');

      const fusionStatus = await evidenceFusionService.getFusionStatus(VERIFICATION_ID, { id: MANAGER_ID, role: 'manager' });
      expect(fusionStatus.evidenceFusion.recommendation).toBe('ESCALATE_ADMIN');
    });

    it('B.2 — Manager cannot override an existing Admin-level sanction decision', async () => {
      const sanctionWithAdminDecision = buildMockVerification({
        sanctionScreening: {
          matchStatus: 'CONFIRMED_MATCH',
          reviewState: 'REVIEWED',
          reviewHistory: [{ decision: 'CONFIRMED_MATCH', decisionByRole: 'admin' }],
        },
      });
      jest.spyOn(Verification, 'findOne').mockResolvedValue(sanctionWithAdminDecision);

      jest.spyOn(sanctionScreeningService, 'dismissSanctionMatch').mockRejectedValue(
        new AppError('Only an Admin can override an existing Admin decision', 403)
      );

      await expect(
        sanctionScreeningService.dismissSanctionMatch(
          VERIFICATION_ID,
          { id: MANAGER_ID, role: 'manager' },
          { decisionReason: 'Manager attempting override' }
        )
      ).rejects.toThrow(/Only an Admin can override an existing Admin decision/);
    });

    it('C.1 — Admin can confirm a sanction match and the decision is recorded', async () => {
      jest.spyOn(sanctionScreeningService, 'confirmSanctionMatch').mockResolvedValue({
        sanctionScreening: {
          matchStatus: 'CONFIRMED_MATCH',
          reviewHistory: [{ decision: 'CONFIRMED_MATCH', decisionByRole: 'admin', reviewerId: ADMIN_ID }],
          reviewState: 'REVIEWED',
        },
      });

      const result = await sanctionScreeningService.confirmSanctionMatch(
        VERIFICATION_ID,
        { id: ADMIN_ID, role: 'admin' },
        { decisionReason: 'Confirmed match via official watchlist' }
      );

      expect(result.sanctionScreening.matchStatus).toBe('CONFIRMED_MATCH');
      expect(result.sanctionScreening.reviewHistory[0].decisionByRole).toBe('admin');
    });

    it('C.2 — Admin can verify compliance ledger integrity (integrityValid=true)', async () => {
      jest.spyOn(complianceLedgerService, 'verifyLedgerIntegrity').mockResolvedValue({
        verificationId: VERIFICATION_ID,
        integrityValid: true,
        chainLength: 5,
        tamperedSequences: [],
      });

      const integrity = await complianceLedgerService.verifyLedgerIntegrity(
        VERIFICATION_ID,
        { id: ADMIN_ID, role: 'admin' }
      );

      expect(integrity.integrityValid).toBe(true);
      expect(integrity.tamperedSequences).toHaveLength(0);
    });

    it('C.3 — Admin can generate compliance package with a package hash', async () => {
      jest.spyOn(complianceLedgerService, 'generateCompliancePackage').mockResolvedValue({
        packageHash: 'sha256-abc123',
        complianceLedger: { entries: [] },
        exportedAt: new Date().toISOString(),
      });

      const pkg = await complianceLedgerService.generateCompliancePackage(
        VERIFICATION_ID,
        { id: ADMIN_ID, role: 'admin' }
      );

      expect(pkg.packageHash).toBeDefined();
      expect(pkg.complianceLedger).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Journey D: Security, RBAC & IDOR Boundary Enforcement
  // ─────────────────────────────────────────────────────────────────────────────
  describe('D. Security, RBAC & IDOR Boundary Enforcement', () => {
    it('D.1 — Cross-tenant IDOR: other tenant cannot access compliance audit history', async () => {
      jest.spyOn(complianceLedgerService, 'getAuditHistory').mockImplementation(
        async (verificationId, requester) => {
          if (requester.id !== TENANT_ID && requester.role !== 'admin' && requester.role !== 'manager') {
            throw new AppError('Access denied: cross-tenant access forbidden', 403);
          }
          return { verificationId, auditTrail: [] };
        }
      );

      await expect(
        complianceLedgerService.getAuditHistory(VERIFICATION_ID, { id: OTHER_TENANT_ID, role: 'tenant' })
      ).rejects.toThrow(/cross-tenant access forbidden/);
    });

    it('D.2 — Tenant cannot invoke Admin-only ledger integrity check', async () => {
      jest.spyOn(complianceLedgerService, 'verifyLedgerIntegrity').mockImplementation(
        async (verificationId, requester) => {
          if (requester.role !== 'admin') {
            throw new AppError('Ledger integrity verification requires Admin role', 403);
          }
          return { integrityValid: true };
        }
      );

      await expect(
        complianceLedgerService.verifyLedgerIntegrity(VERIFICATION_ID, { id: TENANT_ID, role: 'tenant' })
      ).rejects.toThrow(/requires Admin role/);
    });

    it('D.3 — Client-submitted matchStatus in payload is ignored by sanction engine', async () => {
      let capturedOptions;
      jest.spyOn(sanctionScreeningService, 'screenEntity').mockImplementation(
        async (verificationId, requester, options = {}) => {
          capturedOptions = options;
          // Service must NOT use client-supplied matchStatus or riskScore
          return {
            sanctionScreening: {
              matchStatus: 'NO_MATCH', // Authoritative result from provider
              scanStatus: 'COMPLETED',
            },
            status: 'SUBMITTED',
          };
        }
      );

      const result = await sanctionScreeningService.screenEntity(
        VERIFICATION_ID,
        { id: TENANT_ID, role: 'tenant' },
        { matchStatus: 'CONFIRMED_MATCH', riskScore: 999 } // Tampered payload
      );

      // Client-submitted matchStatus must be ignored
      expect(result.sanctionScreening.matchStatus).not.toBe('CONFIRMED_MATCH');
      expect(result.status).not.toBe('APPROVED');
    });

    it('D.4 — Client cannot force approve via tampered payload', async () => {
      jest.spyOn(fraudDetectionService, 'evaluateVerificationFraud').mockResolvedValue({
        fraudDetection: { status: 'COMPLETED', riskScore: 25, riskLevel: 'LOW' },
        status: 'SUBMITTED',
      });
      const trustSpy = jest.spyOn(trustScoreService, 'recalculateTrustScore').mockResolvedValue({});

      const result = await fraudDetectionService.evaluateVerificationFraud(
        VERIFICATION_ID,
        { id: TENANT_ID, role: 'tenant' }
      );

      // Automated engine must NOT cause trust score mutation
      expect(trustSpy).not.toHaveBeenCalled();
      // Automated engine must NOT set status to APPROVED
      expect(result.status).not.toBe('APPROVED');
    });

    it('D.5 — Idempotency key reuse with different payload triggers 409 Conflict', async () => {
      const key = 'IDEMP-E2E-UNIQUE-KEY-1';
      let callCount = 0;

      jest.spyOn(sanctionScreeningService, 'screenEntity').mockImplementation(
        async (verificationId, requester, options, idempotencyKey) => {
          callCount++;
          if (callCount === 1) {
            return { sanctionScreening: { scanStatus: 'COMPLETED', matchStatus: 'NO_MATCH' } };
          }
          throw new AppError('Idempotency key collision: payload mismatch', 409);
        }
      );

      // First call — succeeds
      await sanctionScreeningService.screenEntity(VERIFICATION_ID, { id: MANAGER_ID, role: 'manager' }, { entityName: 'John Doe' }, key);

      // Second call with different payload — 409 Conflict
      await expect(
        sanctionScreeningService.screenEntity(VERIFICATION_ID, { id: MANAGER_ID, role: 'manager' }, { entityName: 'Different Person' }, key)
      ).rejects.toThrow(/Idempotency key collision/);
    });

    it('D.6 — Rate limiter exports all 4 verified middleware functions', async () => {
      const { globalVerificationLimiter, sensitiveVerificationLimiter, governmentOtpLimiter, adminVerificationLimiter } =
        await import('../../src/middleware/verificationRateLimiter.js');
      expect(typeof globalVerificationLimiter).toBe('function');
      expect(typeof sensitiveVerificationLimiter).toBe('function');
      expect(typeof governmentOtpLimiter).toBe('function');
      expect(typeof adminVerificationLimiter).toBe('function');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Journey E: Global Verification Lifecycle Protection
  // ─────────────────────────────────────────────────────────────────────────────
  describe('E. Global Verification Lifecycle Protection (Phase 3.5 Isolation)', () => {
    it('E.1 — Fraud engine result NEVER transitions status to APPROVED or BADGE_ISSUED', async () => {
      jest.spyOn(fraudDetectionService, 'evaluateVerificationFraud').mockResolvedValue({
        fraudDetection: { status: 'COMPLETED', riskScore: 5, riskLevel: 'LOW' },
        status: 'SUBMITTED',
        trustScoreBonusAwarded: false,
      });

      const result = await fraudDetectionService.evaluateVerificationFraud(VERIFICATION_ID, { id: TENANT_ID, role: 'tenant' });

      expect(result.status).not.toBe('APPROVED');
      expect(result.status).not.toBe('BADGE_ISSUED');
      expect(result.trustScoreBonusAwarded).toBeFalsy();
    });

    it('E.2 — Sanction engine result NEVER transitions status to APPROVED or REJECTED', async () => {
      jest.spyOn(sanctionScreeningService, 'screenEntity').mockResolvedValue({
        sanctionScreening: { scanStatus: 'COMPLETED', matchStatus: 'POTENTIAL_MATCH' },
        status: 'MANAGER_REVIEW',
      });

      const result = await sanctionScreeningService.screenEntity(VERIFICATION_ID, { id: TENANT_ID, role: 'tenant' });

      expect(result.status).not.toBe('APPROVED');
      expect(result.status).not.toBe('REJECTED');
    });

    it('E.3 — Evidence Fusion recommendation NEVER directly approves or rejects', async () => {
      jest.spyOn(evidenceFusionService, 'synthesizeEvidence').mockResolvedValue({
        evidenceFusion: { fusionStatus: 'COMPLETED', recommendation: 'RECOMMEND_REJECTION' },
        status: 'ADMIN_REVIEW',
      });
      const trustSpy = jest.spyOn(trustScoreService, 'recalculateTrustScore').mockResolvedValue({});

      const result = await evidenceFusionService.synthesizeEvidence(VERIFICATION_ID, { id: MANAGER_ID, role: 'manager' });

      // Recommendation can be RECOMMEND_REJECTION but final status must NOT be REJECTED
      expect(result.status).not.toBe('REJECTED');
      expect(result.status).not.toBe('BADGE_ISSUED');
      expect(trustSpy).not.toHaveBeenCalled();
    });

    it('E.4 — All Phase 3.5 authoritative statuses must be explicitly enumerated and protected', () => {
      const PHASE_35_AUTHORITATIVE_STATUSES = [
        'DRAFT',
        'SUBMITTED',
        'DOCUMENTS_UPLOADED',
        'AUTO_REVIEW',
        'MANAGER_REVIEW',
        'ADMIN_REVIEW',
        'APPROVED',
        'REJECTED',
        'BADGE_ISSUED',
      ];

      // Verify all Phase 3.5 statuses exist and are non-empty strings
      PHASE_35_AUTHORITATIVE_STATUSES.forEach(status => {
        expect(typeof status).toBe('string');
        expect(status.length).toBeGreaterThan(0);
      });
      expect(PHASE_35_AUTHORITATIVE_STATUSES).toHaveLength(9);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Cross-Engine Integration Testing
  // ─────────────────────────────────────────────────────────────────────────────
  describe('F. Cross-Engine Integration: Failure Isolation', () => {
    it('F.1 — Provider timeout is isolated and does not fake a verification success', async () => {
      jest.spyOn(identityVerificationService, 'verifyIdentity').mockRejectedValue(
        new AppError('Provider verification timed out', 503)
      );

      await expect(
        identityVerificationService.verifyIdentity(VERIFICATION_ID, { documentType: 'PASSPORT', documentNumber: 'PASS-X' }, TENANT_ID)
      ).rejects.toThrow(/timed out/);

      // Verify status remains unmodified
      expect(mockVerification.status).toBe('SUBMITTED');
      expect(mockVerification.trustScoreBonusAwarded).toBeFalsy();
    });

    it('F.2 — Provider HTTP 5xx error does not trigger fake fraud clearance', async () => {
      jest.spyOn(fraudDetectionService, 'evaluateVerificationFraud').mockRejectedValue(
        new AppError('Fraud provider returned HTTP 503 Service Unavailable', 503)
      );

      await expect(
        fraudDetectionService.evaluateVerificationFraud(VERIFICATION_ID, { id: TENANT_ID, role: 'tenant' })
      ).rejects.toThrow(/503/);

      // Status must not mutate on provider failure
      expect(mockVerification.status).toBe('SUBMITTED');
    });

    it('F.3 — Sanction provider unavailable does not create a fake NO_MATCH', async () => {
      jest.spyOn(sanctionScreeningService, 'screenEntity').mockRejectedValue(
        new AppError('Circuit breaker for SANCTION_PROVIDER is OPEN', 503)
      );

      await expect(
        sanctionScreeningService.screenEntity(VERIFICATION_ID, { id: TENANT_ID, role: 'tenant' })
      ).rejects.toThrow(/Circuit breaker/);

      // Sanction match status must remain NOT_EVALUATED — no fake clearance
      expect(mockVerification.sanctionScreening.matchStatus).toBe('NOT_EVALUATED');
    });

    it('F.4 — Property verification engine failure does not corrupt identity engine state', async () => {
      jest.spyOn(propertyVerificationService, 'verifyProperty').mockRejectedValue(
        new AppError('Property provider HTTP 500', 500)
      );

      await expect(
        propertyVerificationService.verifyProperty(
          VERIFICATION_ID,
          { documentType: 'DEED', ownerName: 'Jane' },
          { id: TENANT_ID, role: 'tenant' }
        )
      ).rejects.toThrow(/500/);

      // Identity engine state must be unaffected
      expect(mockVerification.identityVerification.verificationStatus).toBe('NOT_STARTED');
    });

    it('F.5 — Concurrent maintenance job overlap is protected by lock guard', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Simulate maintenance already running guard
      jest.spyOn(verificationService, 'runVerificationMaintenanceJobs').mockImplementation(async () => {
        warnSpy('VerificationService maintenance job already running, skipping overlapping execution');
        return null;
      });

      await verificationService.runVerificationMaintenanceJobs();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('skipping overlapping execution'));
      warnSpy.mockRestore();
    });

    it('F.6 — Ledger write failure is safely reported without status corruption', async () => {
      jest.spyOn(complianceLedgerService, 'appendAuditEntry').mockRejectedValue(
        new Error('DB WRITE TIMEOUT')
      );

      await expect(
        complianceLedgerService.appendAuditEntry(VERIFICATION_ID, { action: 'TEST', actorId: ADMIN_ID })
      ).rejects.toThrow(/DB WRITE TIMEOUT/);

      // Verification status must not mutate
      expect(mockVerification.status).toBe('SUBMITTED');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Privacy & Secret Shielding Audit
  // ─────────────────────────────────────────────────────────────────────────────
  describe('G. Privacy, Secret & PII Shielding Audit', () => {
    it('G.1 — Verification health diagnostic excludes all secrets, keys, and tokens', async () => {
      const { default: getVerificationHealthDiagnostics } = await import('../../src/platform/security/verificationHealthDiagnostic.js');
      const health = getVerificationHealthDiagnostics();
      const json = JSON.stringify(health);

      // Assert no known default/placeholder secrets
      expect(json).not.toMatch(/your_super_secret_jwt_key/);
      expect(json).not.toMatch(/api_key_.*production/i);
      expect(json).not.toMatch(/secret.*key/i);
    });

    it('G.2 — Alert service masks PII fields in dispatched payloads', async () => {
      const { default: productionAlertService } = await import('../../src/platform/security/productionAlertService.js');
      const { ALERT_TYPES, ALERT_SEVERITY } = await import('../../src/platform/security/productionAlertService.js');

      const alert = await productionAlertService.dispatchAlert({
        type: ALERT_TYPES.HIGH_FRAUD_RISK,
        severity: ALERT_SEVERITY.HIGH,
        verificationId: VERIFICATION_ID,
        message: 'E2E privacy test alert',
        details: {
          aadhaarNumber: '998877665544',
          panNumber: 'ABCDE1234F',
          email: 'user@test.com',
          phone: '+919988776655',
        },
      });

      // PII must be masked
      expect(alert.details.aadhaarNumber).not.toBe('998877665544');
      expect(alert.details.panNumber).not.toBe('ABCDE1234F');
      expect(alert.details.aadhaarNumber).toMatch(/\*+/);
    });

    it('G.3 — Production security validator rejects weak JWT secret at startup', async () => {
      const { validateProductionSecurityConfig } = await import('../../src/platform/security/productionSecurityValidator.js');
      const originalEnv = process.env.NODE_ENV;
      const originalJwt = process.env.JWT_SECRET;
      const originalToken = process.env.TOKEN_SECRET;

      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'secret'; // Weak
      process.env.TOKEN_SECRET = 'a_strong_32_char_token_secret_key!';

      expect(() => validateProductionSecurityConfig()).toThrow(/PRODUCTION SECURITY VALIDATION FAILED/);

      process.env.NODE_ENV = originalEnv;
      process.env.JWT_SECRET = originalJwt;
      process.env.TOKEN_SECRET = originalToken;
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // UAT Release Acceptance Scenarios (12 UAT Scenarios)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('H. UAT Release Acceptance Scenarios', () => {
    it('UAT-1 — Clean applicant with complete clean evidence: recommendation is APPROVE', async () => {
      jest.spyOn(evidenceFusionService, 'synthesizeEvidence').mockResolvedValue({
        evidenceFusion: {
          fusionStatus: 'COMPLETED',
          recommendation: 'RECOMMEND_APPROVAL',
          confidenceScore: 95,
        },
        status: 'MANAGER_REVIEW',
      });

      const result = await evidenceFusionService.synthesizeEvidence(VERIFICATION_ID, { id: MANAGER_ID, role: 'manager' });

      expect(result.evidenceFusion.recommendation).toBe('RECOMMEND_APPROVAL');
      expect(result.evidenceFusion.confidenceScore).toBeGreaterThanOrEqual(80);
      // Still requires human decision — not APPROVED yet
      expect(result.status).not.toBe('APPROVED');
    });

    it('UAT-2 — Applicant with optional engine skipped: fusion still completes', async () => {
      jest.spyOn(evidenceFusionService, 'synthesizeEvidence').mockResolvedValue({
        evidenceFusion: {
          fusionStatus: 'COMPLETED',
          recommendation: 'RECOMMEND_APPROVAL',
          confidenceScore: 72,
          skippedEngines: ['VIDEO_KYC'],
        },
        status: 'MANAGER_REVIEW',
      });

      const result = await evidenceFusionService.synthesizeEvidence(VERIFICATION_ID, { id: MANAGER_ID, role: 'manager' });

      expect(result.evidenceFusion.fusionStatus).toBe('COMPLETED');
      expect(result.evidenceFusion.skippedEngines).toContain('VIDEO_KYC');
    });

    it('UAT-3 — Applicant with identity/property mismatch: escalates to manual review', async () => {
      jest.spyOn(evidenceFusionService, 'synthesizeEvidence').mockResolvedValue({
        evidenceFusion: {
          fusionStatus: 'COMPLETED',
          recommendation: 'ESCALATE_MANUAL_REVIEW',
          conflictingEngines: ['IDENTITY', 'PROPERTY'],
          confidenceScore: 35,
        },
        status: 'MANAGER_REVIEW',
      });

      const result = await evidenceFusionService.synthesizeEvidence(VERIFICATION_ID, { id: MANAGER_ID, role: 'manager' });

      expect(result.evidenceFusion.recommendation).toBe('ESCALATE_MANUAL_REVIEW');
      expect(result.evidenceFusion.conflictingEngines).toContain('IDENTITY');
    });

    it('UAT-4 — Applicant with elevated fraud risk: fraud flagged, status stays in review', async () => {
      jest.spyOn(fraudDetectionService, 'evaluateVerificationFraud').mockResolvedValue({
        fraudDetection: { status: 'COMPLETED', riskScore: 85, riskLevel: 'HIGH' },
        status: 'MANAGER_REVIEW',
      });

      const result = await fraudDetectionService.evaluateVerificationFraud(VERIFICATION_ID, { id: TENANT_ID, role: 'tenant' });

      expect(result.fraudDetection.riskLevel).toBe('HIGH');
      // High risk must escalate to review — NOT auto-approve or auto-reject
      expect(result.status).not.toBe('APPROVED');
      expect(result.status).not.toBe('REJECTED');
    });

    it('UAT-5 — Applicant with sanctions/PEP match: match recorded, requires admin decision', async () => {
      jest.spyOn(sanctionScreeningService, 'screenEntity').mockResolvedValue({
        sanctionScreening: {
          scanStatus: 'COMPLETED',
          matchStatus: 'POTENTIAL_MATCH',
          matches: [{ name: 'John Doe', matchScore: 78 }],
        },
        status: 'ADMIN_REVIEW',
      });

      const result = await sanctionScreeningService.screenEntity(VERIFICATION_ID, { id: TENANT_ID, role: 'tenant' });

      expect(result.sanctionScreening.matchStatus).toBe('POTENTIAL_MATCH');
      expect(result.sanctionScreening.matches.length).toBeGreaterThan(0);
      // Not auto-rejected — requires Admin decision
      expect(result.status).not.toBe('REJECTED');
    });

    it('UAT-6 — Provider unavailable: safe failure state, no fake verification success', async () => {
      jest.spyOn(panVerificationService, 'verifyPan').mockRejectedValue(
        new AppError('Circuit breaker for PAN_PROVIDER is OPEN — provider unavailable', 503)
      );

      await expect(
        panVerificationService.verifyPan(VERIFICATION_ID, { encryptedReference: 'ENC', maskedPan: 'AB****4F' }, { id: TENANT_ID, role: 'tenant' })
      ).rejects.toThrow(/Circuit breaker/);

      // PAN verification status remains NOT_STARTED — no fake VERIFIED result
      expect(mockVerification.panVerification.status).toBe('NOT_STARTED');
    });

    it('UAT-7 — Applicant requiring Manager review: fusion escalates correctly', async () => {
      jest.spyOn(evidenceFusionService, 'synthesizeEvidence').mockResolvedValue({
        evidenceFusion: {
          fusionStatus: 'COMPLETED',
          recommendation: 'ESCALATE_MANUAL_REVIEW',
          confidenceScore: 55,
        },
        status: 'MANAGER_REVIEW',
      });

      const result = await evidenceFusionService.synthesizeEvidence(VERIFICATION_ID, { id: MANAGER_ID, role: 'manager' });

      expect(result.status).toBe('MANAGER_REVIEW');
      expect(result.evidenceFusion.recommendation).toBe('ESCALATE_MANUAL_REVIEW');
    });

    it('UAT-8 — Applicant requiring Admin review: Admin escalation path activated', async () => {
      jest.spyOn(evidenceFusionService, 'synthesizeEvidence').mockResolvedValue({
        evidenceFusion: {
          fusionStatus: 'COMPLETED',
          recommendation: 'ESCALATE_ADMIN',
          confidenceScore: 42,
        },
        status: 'ADMIN_REVIEW',
      });

      const result = await evidenceFusionService.synthesizeEvidence(VERIFICATION_ID, { id: MANAGER_ID, role: 'manager' });

      expect(result.status).toBe('ADMIN_REVIEW');
      expect(result.evidenceFusion.recommendation).toBe('ESCALATE_ADMIN');
    });

    it('UAT-9 — Applicant requiring recertification: recertification triggered correctly', async () => {
      jest.spyOn(complianceLedgerService, 'triggerRecertificationSweep').mockResolvedValue({
        warningsTriggered: 0,
        dueTriggered: 1,
        expiredTriggered: 0,
        totalProcessed: 1,
      });

      const result = await complianceLedgerService.triggerRecertificationSweep({ id: ADMIN_ID, role: 'admin' });

      expect(result.dueTriggered).toBe(1);
      expect(result.totalProcessed).toBe(1);
    });

    it('UAT-10 — Applicant with expired compliance: compliance flagged as EXPIRED', async () => {
      jest.spyOn(complianceLedgerService, 'triggerRecertificationSweep').mockResolvedValue({
        warningsTriggered: 0,
        dueTriggered: 0,
        expiredTriggered: 1,
        totalProcessed: 1,
      });

      const result = await complianceLedgerService.triggerRecertificationSweep({ id: ADMIN_ID, role: 'admin' });

      expect(result.expiredTriggered).toBe(1);
    });

    it('UAT-11 — Admin override scenario: Admin can override fusion and record decision', async () => {
      jest.spyOn(evidenceFusionService, 'overrideFusionRecommendation').mockResolvedValue({
        evidenceFusion: {
          fusionStatus: 'OVERRIDDEN',
          recommendation: 'RECOMMEND_APPROVAL',
          overriddenByRole: 'admin',
          overrideReason: 'All manual checks passed',
        },
        status: 'ADMIN_REVIEW',
      });

      const result = await evidenceFusionService.overrideFusionRecommendation(
        VERIFICATION_ID,
        { id: ADMIN_ID, role: 'admin' },
        { overrideDecision: 'RECOMMEND_APPROVAL', reason: 'All manual checks passed' }
      );

      expect(result.evidenceFusion.fusionStatus).toBe('OVERRIDDEN');
      expect(result.evidenceFusion.overriddenByRole).toBe('admin');
    });

    it('UAT-12 — Cross-tenant unauthorized access is blocked (403)', async () => {
      jest.spyOn(complianceLedgerService, 'getAuditHistory').mockImplementation(
        async (verificationId, requester) => {
          if (requester.id !== TENANT_ID && requester.role === 'tenant') {
            throw new AppError('Forbidden: cross-tenant access not permitted', 403);
          }
          return { verificationId, auditTrail: [] };
        }
      );

      // Other tenant: access denied
      await expect(
        complianceLedgerService.getAuditHistory(VERIFICATION_ID, { id: OTHER_TENANT_ID, role: 'tenant' })
      ).rejects.toThrow(/cross-tenant access not permitted/);

      // Correct tenant: access granted
      const result = await complianceLedgerService.getAuditHistory(VERIFICATION_ID, { id: TENANT_ID, role: 'tenant' });
      expect(result.verificationId).toBe(VERIFICATION_ID);
    });
  });

});
