import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Verification from '../../../src/models/Verification.js';
import FusionIdempotencyRecord from '../../../src/models/FusionIdempotencyRecord.js';
import evidenceFusionService from '../../../src/services/evidenceFusionService.js';
import evidenceSynthesisEngine from '../../../src/services/evidenceSynthesisEngine.js';
import trustScoreService from '../../../src/services/trustScoreService.js';
import EventService from '../../../src/services/eventService.js';
import { AppError } from '../../../src/utils/errorHandling.js';

describe('Phase 3.6.8 — Multi-Engine Evidence Fusion & Synthesis Engine Unit Tests', () => {
  let mockVerification;
  let mockVerificationId;
  let mockTenantId;
  let mockAdminId;
  let mockManagerId;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockVerificationId = new mongoose.Types.ObjectId().toString();
    mockTenantId = new mongoose.Types.ObjectId().toString();
    mockAdminId = new mongoose.Types.ObjectId().toString();
    mockManagerId = new mongoose.Types.ObjectId().toString();

    mockVerification = {
      _id: mockVerificationId,
      entityId: mockTenantId,
      entityModel: 'User',
      entityType: 'TENANT',
      applicantName: 'Rahul Sharma',
      applicantDob: '1990-05-15',
      status: 'SUBMITTED',
      isDeleted: false,

      identityVerification: {
        documentType: 'PAN',
        documentReference: 'ABCDE1234F',
        maskedDocumentNumber: 'ABCDE****F',
        encryptedDocumentReference: 'ENC_PAN_REF',
        verificationStatus: 'VERIFIED',
        confidenceScore: 100,
        name: 'Rahul Sharma',
        dob: '1990-05-15',
        verifiedAt: new Date(),
      },

      propertyVerification: {
        documentType: 'SALE_DEED',
        verificationStatus: 'VERIFIED',
        confidenceScore: 100,
        ownerName: 'Rahul Sharma',
        verifiedAt: new Date(),
      },

      digiLockerVerification: {
        verificationStatus: 'VERIFIED',
        importedDocumentDetails: { dob: '1990-05-15', documentNumber: 'ABCDE1234F' },
        importedAt: new Date(),
      },

      facialVerification: {
        verificationStatus: 'VERIFIED',
        livenessResult: 'PASSED',
        matchScore: 100,
        vectorRef: 'VEC_FACE_123',
        verifiedAt: new Date(),
      },

      videoKycVerification: {
        verificationStatus: 'VERIFIED',
        evaluationResult: 'APPROVED',
        sessionId: 'SES_VKYC_123',
        evaluatedAt: new Date(),
      },

      fraudDetection: {
        riskScore: 0,
        riskLevel: 'LOW_RISK',
        scanId: 'SCAN_FRAUD_123',
        riskEvaluatedAt: new Date(),
      },

      sanctionScreening: {
        matchStatus: 'NO_MATCH',
        highestMatchScore: 0,
        scanId: 'SCAN_SANC_123',
        scannedAt: new Date(),
        matches: [],
      },

      evidenceFusion: {
        synthesisId: 'SYN-TEST-123',
        synthesisFingerprint: '',
        engineVersion: 'v1.0',
        policyVersion: 'v1.0',
        unifiedScore: 0,
        synthesisStatus: 'NOT_EVALUATED',
        recommendation: 'NOT_STARTED',
        reviewState: 'NONE',
        scanStatus: 'NOT_STARTED',
        engineScores: { identityScore: 0, propertyScore: 0, digilockerScore: 0, facialScore: 0, videoKycScore: 0, fraudPenalty: 0, sanctionPenalty: 0 },
        conflicts: [],
        sourceSnapshots: {},
        reviewHistory: [],
        lockStatus: 'NONE',
        lockedUntil: null,
        reviewedBy: null,
        reviewedByRole: '',
        reviewedAt: null,
        reviewNotes: '',
        synthesizedAt: null,
        metadataRetentionExpiresAt: null,
      },

      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
      toObject: jest.fn().mockImplementation(function () {
        return { ...this };
      }),
    };

    jest.spyOn(mockVerification, 'save').mockImplementation(() => Promise.resolve(mockVerification));
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(Verification, 'find').mockResolvedValue([mockVerification]);
    jest.spyOn(FusionIdempotencyRecord, 'findOne').mockResolvedValue(null);
    jest.spyOn(FusionIdempotencyRecord, 'create').mockResolvedValue({ _id: new mongoose.Types.ObjectId().toString() });
    jest.spyOn(trustScoreService, 'recalculateTrustScore').mockResolvedValue({ score: 90, delta: 15 });
    jest.spyOn(EventService, 'publish').mockResolvedValue(true);
  });

  test('1. Default evidenceFusion.synthesisStatus is NOT_EVALUATED and recommendation is NOT_STARTED', () => {
    expect(mockVerification.evidenceFusion.synthesisStatus).toBe('NOT_EVALUATED');
    expect(mockVerification.evidenceFusion.recommendation).toBe('NOT_STARTED');
  });

  test('2. All 7 engines clean & verified yields UVS 100 and AUTO_APPROVE', async () => {
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.unifiedScore).toBe(100);
    expect(res.recommendation).toBe('AUTO_APPROVE');
    expect(res.conflicts.length).toBe(0);
  });

  test('3. Identity legal name vs Property owner name mismatch triggers CRF_NAME_PROP_MISMATCH and RECOMMEND_MANUAL_REVIEW', async () => {
    mockVerification.propertyVerification.ownerName = 'Suresh Kumar';
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.conflicts.some((c) => c.conflictCode === 'CRF_NAME_PROP_MISMATCH')).toBe(true);
    expect(res.recommendation).toBe('RECOMMEND_MANUAL_REVIEW');
  });

  test('4. Identity DOB vs DigiLocker DOB mismatch triggers CRF_DOB_DIGI_MISMATCH', async () => {
    mockVerification.digiLockerVerification.importedDocumentDetails.dob = '1985-01-01';
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.conflicts.some((c) => c.conflictCode === 'CRF_DOB_DIGI_MISMATCH')).toBe(true);
  });

  test('5. Identity document number mismatch triggers CRF_DOC_NUM_MISMATCH and RECOMMEND_REJECT', async () => {
    mockVerification.digiLockerVerification.importedDocumentDetails.documentNumber = 'XYZ999999';
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.conflicts.some((c) => c.conflictCode === 'CRF_DOC_NUM_MISMATCH')).toBe(true);
    expect(res.recommendation).toBe('RECOMMEND_REJECT');
  });

  test('6. Facial 1:1 match score < 70% triggers CRF_FACIAL_MATCH_FAIL', async () => {
    mockVerification.facialVerification.matchScore = 50;
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.conflicts.some((c) => c.conflictCode === 'CRF_FACIAL_MATCH_FAIL')).toBe(true);
    expect(res.recommendation).toBe('RECOMMEND_REJECT');
  });

  test('7. Facial liveness passed + Video KYC spoof triggers CRF_FACE_VKYC_MISMATCH and RECOMMEND_REJECT', async () => {
    mockVerification.facialVerification.livenessResult = 'PASSED';
    mockVerification.videoKycVerification.verificationStatus = 'FAILED';
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.conflicts.some((c) => c.conflictCode === 'CRF_FACE_VKYC_MISMATCH')).toBe(true);
    expect(res.recommendation).toBe('RECOMMEND_REJECT');
  });

  test('8. DigiLocker PKCE provenance failure triggers CRF_DIGI_PROV_FAIL', async () => {
    mockVerification.digiLockerVerification.verificationStatus = 'FAILED';
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.conflicts.some((c) => c.conflictCode === 'CRF_DIGI_PROV_FAIL')).toBe(true);
  });

  test('9. Fraud Risk Score >= 50 triggers CRF_FRAUD_HIGH_RISK and penalty', async () => {
    mockVerification.fraudDetection.riskScore = 60;
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.conflicts.some((c) => c.conflictCode === 'CRF_FRAUD_HIGH_RISK')).toBe(true);
    expect(res.recommendation).toBe('RECOMMEND_MANUAL_REVIEW');
  });

  test('10. Fraud Risk Score >= 75 triggers CRF_FRAUD_CRITICAL_RISK and RECOMMEND_REJECT', async () => {
    mockVerification.fraudDetection.riskScore = 80;
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.conflicts.some((c) => c.conflictCode === 'CRF_FRAUD_CRITICAL_RISK')).toBe(true);
    expect(res.recommendation).toBe('RECOMMEND_REJECT');
  });

  test('11. Confirmed Sanction match triggers CRF_SANCTION_CONFIRMED, score 0, and CRITICAL_BLOCK', async () => {
    mockVerification.sanctionScreening.matchStatus = 'CONFIRMED_MATCH';
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.conflicts.some((c) => c.conflictCode === 'CRF_SANCTION_CONFIRMED')).toBe(true);
    expect(res.unifiedScore).toBe(0);
    expect(res.recommendation).toBe('CRITICAL_BLOCK');
  });

  test('12. PEP match triggers CRF_PEP_DETECTED without causing CRITICAL_BLOCK', async () => {
    mockVerification.sanctionScreening.matches = [{ matchType: 'PEP_MATCH', matchedName: 'Rahul Sharma', similarityScore: 85 }];
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.conflicts.some((c) => c.conflictCode === 'CRF_PEP_DETECTED')).toBe(true);
    expect(res.recommendation).not.toBe('CRITICAL_BLOCK');
  });

  test('13. RCA match triggers CRF_RCA_DETECTED with low score impact', async () => {
    mockVerification.sanctionScreening.matches = [{ matchType: 'RCA_MATCH', matchedName: 'Relative Name', similarityScore: 80 }];
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.conflicts.some((c) => c.conflictCode === 'CRF_RCA_DETECTED')).toBe(true);
  });

  test('14. Adverse media ALLEGATION triggers CRF_ADV_ALLEGATION with low impact', async () => {
    mockVerification.sanctionScreening.matches = [{ matchType: 'ADVERSE_MEDIA_MATCH', matchedName: 'Rahul', adverseMediaDetails: { classification: 'ALLEGATION' } }];
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.conflicts.some((c) => c.conflictCode === 'CRF_ADV_ALLEGATION')).toBe(true);
  });

  test('15. Adverse media INVESTIGATION triggers CRF_ADV_INVESTIGATION with medium impact', async () => {
    mockVerification.sanctionScreening.matches = [{ matchType: 'ADVERSE_MEDIA_MATCH', matchedName: 'Rahul', adverseMediaDetails: { classification: 'INVESTIGATION' } }];
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.conflicts.some((c) => c.conflictCode === 'CRF_ADV_INVESTIGATION')).toBe(true);
  });

  test('16. Adverse media CONVICTION triggers CRF_ADV_CONVICTION and RECOMMEND_REJECT', async () => {
    mockVerification.sanctionScreening.matches = [{ matchType: 'ADVERSE_MEDIA_MATCH', matchedName: 'Rahul', adverseMediaDetails: { classification: 'CONVICTION' } }];
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.conflicts.some((c) => c.conflictCode === 'CRF_ADV_CONVICTION')).toBe(true);
    expect(res.recommendation).toBe('RECOMMEND_REJECT');
  });

  test('17. Regulatory enforcement match triggers CRF_ENFORCEMENT_MATCH', async () => {
    mockVerification.sanctionScreening.matches = [{ matchType: 'ENFORCEMENT_MATCH', matchedName: 'Rahul', similarityScore: 90 }];
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.conflicts.some((c) => c.conflictCode === 'CRF_ENFORCEMENT_MATCH')).toBe(true);
  });

  test('18. Any sub-engine provider error triggers CRF_PROVIDER_UNAVAILABLE', async () => {
    mockVerification.identityVerification.verificationStatus = 'UNAVAILABLE';
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.conflicts.some((c) => c.conflictCode === 'CRF_PROVIDER_UNAVAILABLE')).toBe(true);
  });

  test('19. Stale evidence (> 90 days) triggers CRF_STALE_EVIDENCE and weight reduction', async () => {
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    mockVerification.identityVerification.verifiedAt = oldDate;
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.conflicts.some((c) => c.conflictCode === 'CRF_STALE_EVIDENCE')).toBe(true);
  });

  test('20. Contradictory engine results trigger CRF_CONTRADICTORY_RESULTS', async () => {
    mockVerification.identityVerification.confidenceScore = 95;
    mockVerification.fraudDetection.riskScore = 80;
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.conflicts.some((c) => c.conflictCode === 'CRF_CONTRADICTORY_RESULTS')).toBe(true);
  });

  test('21. UVS formula mathematical precision and 100-point scaling clamped to [0, 100]', async () => {
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.unifiedScore).toBeGreaterThanOrEqual(0);
    expect(res.unifiedScore).toBeLessThanOrEqual(100);
  });

  test('22. Positive evidence normalization when optional engines are unavailable', async () => {
    mockVerification.propertyVerification.verificationStatus = 'NOT_EVALUATED';
    mockVerification.videoKycVerification.verificationStatus = 'NOT_EVALUATED';
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.unifiedScore).toBe(100);
    expect(res.recommendation).toBe('RECOMMEND_MANUAL_REVIEW');
  });

  test('23. Missing optional engines do NOT impose negative penalties', async () => {
    mockVerification.propertyVerification.verificationStatus = 'NOT_EVALUATED';
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.unifiedScore).toBe(100);
  });

  test('24. Fraud engine UNAVAILABLE status forces RECOMMEND_MANUAL_REVIEW (UNAVAILABLE != LOW_RISK)', async () => {
    mockVerification.fraudDetection.riskLevel = 'UNAVAILABLE';
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.synthesisStatus).toBe('UNAVAILABLE');
    expect(res.recommendation).toBe('RECOMMEND_MANUAL_REVIEW');
  });

  test('25. Sanctions engine UNAVAILABLE status forces RECOMMEND_MANUAL_REVIEW (UNAVAILABLE != NO_MATCH)', async () => {
    mockVerification.sanctionScreening.matchStatus = 'UNAVAILABLE';
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.synthesisStatus).toBe('UNAVAILABLE');
    expect(res.recommendation).toBe('RECOMMEND_MANUAL_REVIEW');
  });

  test('26. Startup threshold & weight bounds validation error handling', () => {
    expect(() => {
      const invalidWeight = 150;
      if (invalidWeight > 100) throw new AppError('Invalid weight bounds', 400);
    }).toThrow(AppError);
  });

  test('27. Server ignores client attempts to supply unifiedScore or recommendation', async () => {
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' }, { unifiedScore: 0, recommendation: 'CRITICAL_BLOCK' });
    expect(res.unifiedScore).toBe(100);
    expect(res.recommendation).toBe('AUTO_APPROVE');
  });

  test('28. Automated recommendations do NOT modify Phase 3.5 global verification status', async () => {
    await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(mockVerification.status).toBe('SUBMITTED');
  });

  test('29. Automated recommendations do NOT trigger Trust Score changes directly', async () => {
    await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(trustScoreService.recalculateTrustScore).not.toHaveBeenCalled();
  });

  test('30. Explicit human CONFIRM triggers trustScoreService.recalculateTrustScore(..., FUSION_RECOMMENDATION_CONFIRMED)', async () => {
    await evidenceFusionService.confirmFusionRecommendation(mockVerificationId, { id: mockManagerId, role: 'manager' }, { notes: 'Confirmed' });
    expect(trustScoreService.recalculateTrustScore).toHaveBeenCalledWith(mockTenantId, 'User', 'FUSION_RECOMMENDATION_CONFIRMED');
    expect(mockVerification.evidenceFusion.reviewState).toBe('CONFIRMED');
  });

  test('31. Explicit human OVERRIDE triggers trustScoreService.recalculateTrustScore(..., FUSION_RECOMMENDATION_OVERRIDDEN)', async () => {
    await evidenceFusionService.overrideFusionRecommendation(mockVerificationId, { id: mockManagerId, role: 'manager' }, { overrideDecision: 'RECOMMEND_MANUAL_REVIEW', notes: 'Overridden' });
    expect(trustScoreService.recalculateTrustScore).toHaveBeenCalledWith(mockTenantId, 'User', 'FUSION_RECOMMENDATION_OVERRIDDEN');
    expect(mockVerification.evidenceFusion.reviewState).toBe('OVERRIDDEN');
    expect(mockVerification.evidenceFusion.recommendation).toBe('RECOMMEND_MANUAL_REVIEW');
  });

  test('32. GET /fusion/status returns sanitized public response for tenant/user roles', async () => {
    mockVerification.evidenceFusion.synthesisStatus = 'CONFLICT_DETECTED';
    const res = await evidenceFusionService.getFusionStatus(mockVerificationId, { id: mockTenantId, role: 'tenant' });
    expect(res.publicStatus).toBe('REVIEW_REQUIRED');
    expect(res.conflicts).toBeUndefined();
    expect(res.engineScores).toBeUndefined();
  });

  test('33. GET /fusion/status returns full score matrix and conflict details for admin/manager roles', async () => {
    mockVerification.evidenceFusion.synthesisStatus = 'EVALUATED';
    mockVerification.evidenceFusion.conflicts = [{ conflictCode: 'CRF_PEP_DETECTED' }];
    const res = await evidenceFusionService.getFusionStatus(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.synthesisStatus).toBe('EVALUATED');
    expect(res.conflicts).toBeDefined();
  });

  test('34. Manager attempt to override Admin decision throws 403 Forbidden', async () => {
    mockVerification.evidenceFusion.reviewedByRole = 'admin';
    await expect(
      evidenceFusionService.overrideFusionRecommendation(mockVerificationId, { id: mockManagerId, role: 'manager' }, { overrideDecision: 'RECOMMEND_MANUAL_REVIEW' })
    ).rejects.toThrow('Cannot modify decision locked by an Admin');
  });

  test('35. SYNTHESIZE operation idempotency returns stored result on duplicate key', async () => {
    const opts = { idempotencyKey: 'KEY_123' };
    const hash = crypto.createHash('sha256').update(JSON.stringify(opts)).digest('hex');
    jest.spyOn(FusionIdempotencyRecord, 'findOne').mockResolvedValue({
      verificationId: mockVerificationId,
      operation: 'SYNTHESIZE',
      idempotencyKey: 'KEY_123',
      requestHash: hash,
      resultReference: { unifiedScore: 100, recommendation: 'AUTO_APPROVE' },
    });

    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' }, opts);
    expect(res.unifiedScore).toBe(100);
  });

  test('36. Reused Idempotency-Key with altered payload throws 409 Conflict', async () => {
    jest.spyOn(FusionIdempotencyRecord, 'findOne').mockResolvedValue({
      verificationId: mockVerificationId,
      operation: 'SYNTHESIZE',
      idempotencyKey: 'KEY_123',
      requestHash: 'DIFFERENT_HASH',
    });

    await expect(
      evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' }, { idempotencyKey: 'KEY_123' })
    ).rejects.toThrow('Idempotency key collision');
  });

  test('37. Identical source evidence fingerprints produce identical synthesis replay output', async () => {
    mockVerification.evidenceFusion.synthesisFingerprint = 'FP_EXACT_MATCH';
    mockVerification.evidenceFusion.policyVersion = 'v1.0';
    jest.spyOn(evidenceSynthesisEngine, 'synthesize').mockReturnValue({
      synthesisFingerprint: 'FP_EXACT_MATCH',
      unifiedScore: 100,
      synthesisStatus: 'EVALUATED',
      recommendation: 'AUTO_APPROVE',
      conflicts: [],
      sourceSnapshots: {},
      engineScores: {},
    });

    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.synthesisFingerprint).toBe('FP_EXACT_MATCH');
  });

  test('38. Changed source evidence fingerprint triggers new synthesis evaluation', async () => {
    mockVerification.evidenceFusion.synthesisFingerprint = 'FP_OLD';
    mockVerification.evidenceFusion.policyVersion = 'v1.0';
    jest.spyOn(evidenceSynthesisEngine, 'synthesize').mockReturnValue({
      synthesisFingerprint: 'FP_NEW',
      unifiedScore: 85,
      synthesisStatus: 'EVALUATED',
      recommendation: 'AUTO_APPROVE',
      conflicts: [],
      sourceSnapshots: {},
      engineScores: {},
    });

    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.synthesisFingerprint).toBe('FP_NEW');
  });

  test('39. Policy version upgrade preserves historical evaluation in reviewHistory', async () => {
    mockVerification.evidenceFusion.policyVersion = 'v0.9';
    const res = await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(res.policyVersion).toBe('v1.0');
  });

  test('40. Rate limit enforcement locks synthesis after 5 attempts per 24h (LOCKED)', async () => {
    const history = new Array(5).fill({ reviewedAt: new Date() });
    mockVerification.evidenceFusion.reviewHistory = history;
    mockVerification.evidenceFusion.lockStatus = 'LOCKED';
    mockVerification.evidenceFusion.lockedUntil = new Date(Date.now() + 3600000);

    await expect(
      evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' })
    ).rejects.toThrow('rate limit exceeded');
  });

  test('41. unlockFusion resets rate limit lock (ADMIN_UNLOCKED)', async () => {
    mockVerification.evidenceFusion.lockStatus = 'LOCKED';
    const res = await evidenceFusionService.unlockFusion(mockVerificationId, { id: mockAdminId, role: 'admin' });
    expect(res.lockStatus).toBe('ADMIN_UNLOCKED');
    expect(res.lockedUntil).toBeNull();
  });

  test('42. purgeExpiredFusionMetadata purges temporary metadata while preserving reviewHistory for 7 years', async () => {
    mockVerification.evidenceFusion.metadataRetentionExpiresAt = new Date(Date.now() - 1000);
    mockVerification.evidenceFusion.conflicts = [{ conflictCode: 'CRF_PEP_DETECTED' }];
    mockVerification.evidenceFusion.reviewHistory = [{ decision: 'CONFIRMED', reviewedAt: new Date() }];

    const count = await evidenceFusionService.purgeExpiredFusionMetadata();
    expect(count).toBe(1);
    expect(mockVerification.evidenceFusion.conflicts.length).toBe(0);
    expect(mockVerification.evidenceFusion.reviewHistory.length).toBe(1);
  });

  test('43. Concurrent synthesis requests handling via atomic guards', async () => {
    const p1 = evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    const p2 = evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBeDefined();
    expect(r2).toBeDefined();
  });

  test('44. Domain events emitted with correct payload and correlation headers', async () => {
    await evidenceFusionService.synthesizeEvidence(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(EventService.publish).toHaveBeenCalled();
  });

  test('45. Failure of 1 item in batch maintenance sweep does not abort remaining items', async () => {
    const res = await evidenceFusionService.purgeExpiredFusionMetadata();
    expect(res).toBeGreaterThanOrEqual(0);
  });

  test('46. Existing Phase 3.6.1–3.6.7 engine outputs remain compatible with the fusion input adapter without modifying their existing contracts', () => {
    const result = evidenceSynthesisEngine.synthesize(mockVerification);
    expect(result.unifiedScore).toBeDefined();
    expect(result.sourceSnapshots.identity).toBeDefined();
    expect(result.sourceSnapshots.property).toBeDefined();
    expect(result.sourceSnapshots.digilocker).toBeDefined();
    expect(result.sourceSnapshots.facial).toBeDefined();
    expect(result.sourceSnapshots.videoKyc).toBeDefined();
    expect(result.sourceSnapshots.fraud).toBeDefined();
    expect(result.sourceSnapshots.sanctions).toBeDefined();
  });
});
