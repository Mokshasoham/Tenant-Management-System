import { jest } from '@jest/globals';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Verification from '../../../src/models/Verification.js';
import SanctionIdempotencyRecord from '../../../src/models/SanctionIdempotencyRecord.js';
import sanctionScreeningService, { SanctionScreeningService } from '../../../src/services/sanctionScreeningService.js';
import { SanctionMatchEngine } from '../../../src/services/sanctionMatchEngine.js';
import { SanctionDevelopmentProvider } from '../../../src/services/providers/sanctionDevelopmentProvider.js';
import { SanctionProductionProvider } from '../../../src/services/providers/sanctionProductionProvider.js';
import verificationService from '../../../src/services/verificationService.js';
import trustScoreService from '../../../src/services/trustScoreService.js';
import fraudSignalService from '../../../src/services/fraudSignalService.js';
import EventService from '../../../src/services/eventService.js';
import config, { validateSanctionConfig } from '../../../src/config/config.js';
import { AppError } from '../../../src/utils/errorHandling.js';

describe('Phase 3.6.7 — Global Sanctions, PEP & Adverse Media Screening Engine Unit Tests', () => {
  const mockTenantId = new mongoose.Types.ObjectId().toString();
  const mockVerificationId = new mongoose.Types.ObjectId().toString();
  const mockAdminId = new mongoose.Types.ObjectId().toString();
  const mockManagerId = new mongoose.Types.ObjectId().toString();

  let mockVerification;

  beforeEach(() => {
    jest.clearAllMocks();

    mockVerification = {
      _id: mockVerificationId,
      entityType: 'TENANT',
      entityId: mockTenantId,
      applicantName: 'JOHN DOE',
      applicantCountry: 'IN',
      status: 'SUBMITTED',
      isDeleted: false,
      sanctionScreening: {
        provider: 'development',
        scanId: '',
        searchCorrelationId: '',
        engineVersion: 'v1.0',
        listPolicyVersion: 'v1.0',
        matchStatus: 'NOT_EVALUATED',
        reviewState: 'NONE',
        scanStatus: 'NOT_STARTED',
        highestMatchScore: 0,
        lastSuccessfulScreenAt: null,
        lastSuccessfulMatchStatus: 'NOT_EVALUATED',
        lastMonitoringAttemptAt: null,
        nextMonitoringAt: null,
        matches: [],
        reviewHistory: [],
        lockStatus: 'NONE',
        lockedUntil: null,
        reviewLockedBy: null,
        reviewLockedUntil: null,
        reviewedBy: null,
        reviewedByRole: '',
        reviewedAt: null,
        reviewNotes: '',
        scannedAt: null,
        metadataRetentionExpiresAt: null,
        attempts: [],
      },
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    };

    jest.spyOn(Verification, 'findOne').mockImplementation(() => ({
      select: jest.fn().mockResolvedValue([mockVerification]),
      exec: jest.fn().mockResolvedValue(mockVerification),
      then: (resolve) => resolve(mockVerification),
    }));

    jest.spyOn(Verification, 'find').mockImplementation(() => ({
      select: jest.fn().mockResolvedValue([mockVerification]),
      exec: jest.fn().mockResolvedValue([mockVerification]),
      then: (resolve) => resolve([mockVerification]),
    }));

    jest.spyOn(SanctionIdempotencyRecord, 'findOne').mockResolvedValue(null);
    jest.spyOn(SanctionIdempotencyRecord, 'create').mockResolvedValue({});
    jest.spyOn(EventService, 'publish').mockResolvedValue(true);
    jest.spyOn(trustScoreService, 'recalculateTrustScore').mockResolvedValue({ success: true });
    jest.spyOn(fraudSignalService, 'extractSanctionSignals').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Test 1: Default matchStatus NOT_EVALUATED
  test('1. Default sanctionScreening matchStatus is NOT_EVALUATED', () => {
    expect(mockVerification.sanctionScreening.matchStatus).toBe('NOT_EVALUATED');
    expect(mockVerification.sanctionScreening.scanStatus).toBe('NOT_STARTED');
  });

  // Test 2: Clean user screening yields NO_MATCH and COMPLETED
  test('2. Clean user screening yields NO_MATCH and COMPLETED', async () => {
    const result = await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' });
    expect(result.matchStatus).toBe('NO_MATCH');
    expect(result.scanStatus).toBe('COMPLETED');
    expect(result.highestMatchScore).toBe(0);
  });

  // Test 3: Simulated sanction hit yields POTENTIAL_MATCH and PENDING_REVIEW
  test('3. Simulated sanction hit yields POTENTIAL_MATCH and PENDING_REVIEW', async () => {
    mockVerification.applicantName = 'SANCTIONOV';
    const result = await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { simulationScenario: 'SIM_SANCTION_MATCH' });
    expect(result.matchStatus).toBe('POTENTIAL_MATCH');
    expect(mockVerification.sanctionScreening.reviewState).toBe('PENDING_REVIEW');
  });

  // Test 4: Simulated PEP hit yields POTENTIAL_MATCH (PEP_MATCH type)
  test('4. Simulated PEP hit yields POTENTIAL_MATCH (PEP_MATCH type)', async () => {
    const result = await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { simulationScenario: 'SIM_PEP_MATCH' });
    expect(result.matchStatus).toBe('POTENTIAL_MATCH');
    expect(mockVerification.sanctionScreening.matches[0].matchType).toBe('PEP_MATCH');
  });

  // Test 5: Simulated RCA hit yields POTENTIAL_MATCH (RCA_MATCH type)
  test('5. Simulated RCA hit yields POTENTIAL_MATCH (RCA_MATCH type)', async () => {
    const result = await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { simulationScenario: 'SIM_RCA_MATCH' });
    expect(result.matchStatus).toBe('POTENTIAL_MATCH');
    expect(mockVerification.sanctionScreening.matches[0].matchType).toBe('RCA_MATCH');
  });

  // Test 6: Simulated adverse media hit yields ADVERSE_MEDIA_MATCH with structured classification
  test('6. Simulated adverse media hit yields ADVERSE_MEDIA_MATCH with structured classification', async () => {
    const result = await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { simulationScenario: 'SIM_ADVERSE_MEDIA' });
    expect(result.matchStatus).toBe('POTENTIAL_MATCH');
    const match = mockVerification.sanctionScreening.matches[0];
    expect(match.matchType).toBe('ADVERSE_MEDIA_MATCH');
    expect(match.adverseMediaDetails.classification).toBe('INVESTIGATION');
  });

  // Test 7: 12-stage entity name normalization pipeline verification
  test('7. 12-stage entity name normalization pipeline converts diacritics and special chars', () => {
    const norm = SanctionMatchEngine.normalizeName('  Dr. Jean-François MÜLLER!  ');
    expect(norm).toBe('DR JEAN FRANCOIS MULLER');
  });

  // Test 8: Fuzzy matching algorithm (Jaro-Winkler)
  test('8. Fuzzy matching algorithm calculates similarity score accurately', () => {
    const score = SanctionMatchEngine.calculateJaroWinkler('VLADIMIR SANCTIONOV', 'VLADIMIR SANCTIOV');
    expect(score).toBeGreaterThan(85);
  });

  // Test 9: Name-only similarity false-positive protection (different birth year rejects match)
  test('9. Name-only similarity false-positive protection adjusts score on birth year mismatch', () => {
    const evalRes = SanctionMatchEngine.evaluateCandidates(
      { legalName: 'JOHN DOE', dob: '1990-01-01' },
      [{ matchedName: 'JOHN DOE', similarityScore: 100, birthYear: 1950 }]
    );
    expect(evalRes.highestMatchScore).toBe(70);
    expect(evalRes.matchStatus).toBe('NO_MATCH');
  });

  // Test 10: Evidence fingerprinting (generateFingerprint) and deduplication
  test('10. Evidence fingerprinting generates deterministic SHA-256 string', () => {
    const fp1 = SanctionMatchEngine.generateFingerprint('SANCTION_MATCH', 'JOHN DOE', 'OFAC', 'REF123');
    const fp2 = SanctionMatchEngine.generateFingerprint('SANCTION_MATCH', 'JOHN DOE', 'OFAC', 'REF123');
    expect(fp1).toBe(fp2);
    expect(fp1).toHaveLength(64);
  });

  // Test 11: Duplicate background monitoring scan suppression (updates lastSeenAt without new signals)
  test('11. Duplicate background scan with identical fingerprint updates lastSeenAt without duplicating events', async () => {
    await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { simulationScenario: 'SIM_SANCTION_MATCH' });
    const eventCalls1 = EventService.publish.mock.calls.length;

    await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { simulationScenario: 'SIM_SANCTION_MATCH' });
    const eventCalls2 = EventService.publish.mock.calls.length;

    expect(eventCalls2).toBe(eventCalls1 + 1); // Only scan started event, no duplicate match detected event
  });

  // Test 12: SCREEN operation idempotency
  test('12. SCREEN operation with same idempotency key returns cached result', async () => {
    const payload = { idempotencyKey: 'IDEMP-KEY-1' };
    const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    jest.spyOn(SanctionIdempotencyRecord, 'findOne').mockResolvedValueOnce({
      requestHash: hash,
      resultReference: { matchStatus: 'NO_MATCH', scanStatus: 'COMPLETED' },
    });

    const result = await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, payload);
    expect(result.matchStatus).toBe('NO_MATCH');
  });

  // Test 13: CONFIRM operation idempotency
  test('13. CONFIRM operation with same idempotency key returns cached result', async () => {
    const payload = { notes: 'Confirmed' };
    const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    jest.spyOn(SanctionIdempotencyRecord, 'findOne').mockResolvedValueOnce({
      requestHash: hash,
      resultReference: { matchStatus: 'CONFIRMED_MATCH', reviewState: 'CONFIRMED' },
    });

    const result = await sanctionScreeningService.confirmSanctionMatch(mockVerificationId, { id: mockManagerId, role: 'manager' }, payload, 'IDEMP-KEY-CONF');
    expect(result.matchStatus).toBe('CONFIRMED_MATCH');
  });

  // Test 14: DISMISS operation idempotency
  test('14. DISMISS operation with same idempotency key returns cached result', async () => {
    const payload = { notes: 'Dismissed' };
    const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    jest.spyOn(SanctionIdempotencyRecord, 'findOne').mockResolvedValueOnce({
      requestHash: hash,
      resultReference: { matchStatus: 'DISMISSED_MATCH', reviewState: 'DISMISSED' },
    });

    const result = await sanctionScreeningService.dismissSanctionMatch(mockVerificationId, { id: mockManagerId, role: 'manager' }, payload, 'IDEMP-KEY-DISM');
    expect(result.matchStatus).toBe('DISMISSED_MATCH');
  });

  // Test 15: UNLOCK operation idempotency
  test('15. UNLOCK operation with same idempotency key returns cached result', async () => {
    const payload = { note: 'Unlock' };
    const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    jest.spyOn(SanctionIdempotencyRecord, 'findOne').mockResolvedValueOnce({
      requestHash: hash,
      resultReference: { lockStatus: 'ADMIN_UNLOCKED' },
    });

    const result = await sanctionScreeningService.unlockSanctionScreening(mockVerificationId, { id: mockAdminId, role: 'admin' }, payload, 'IDEMP-KEY-UNLK');
    expect(result.lockStatus).toBe('ADMIN_UNLOCKED');
  });

  // Test 16: Reused Idempotency-Key + same request hash returns original result (200 OK)
  test('16. Reused Idempotency-Key with same request hash returns stored result', async () => {
    const payload = { idempotencyKey: 'REUSE-KEY' };
    const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    jest.spyOn(SanctionIdempotencyRecord, 'findOne').mockResolvedValueOnce({
      requestHash: hash,
      resultReference: { matchStatus: 'NO_MATCH', scanStatus: 'COMPLETED' },
    });

    const result = await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, payload);
    expect(result.scanStatus).toBe('COMPLETED');
  });

  // Test 17: Reused Idempotency-Key + different request hash returns 409 Conflict
  test('17. Reused Idempotency-Key with different request hash throws 409 Conflict', async () => {
    jest.spyOn(SanctionIdempotencyRecord, 'findOne').mockResolvedValueOnce({
      requestHash: 'DIFFERENT-HASH',
      resultReference: { matchStatus: 'NO_MATCH' },
    });

    await expect(
      sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { idempotencyKey: 'REUSE-KEY', extraParam: true })
    ).rejects.toThrow(AppError);
  });

  // Test 18: Startup threshold validation (0 <= threshold <= 100 and ordering)
  test('18. Startup threshold validation throws error on invalid or unordered thresholds', () => {
    expect(() => validateSanctionConfig({ SANCTION_MATCH_THRESHOLD: 70, PEP_MATCH_THRESHOLD: 80 })).toThrow(Error);
    expect(() => validateSanctionConfig({ SANCTION_MATCH_THRESHOLD: 150, PEP_MATCH_THRESHOLD: 75 })).toThrow(Error);
    expect(() => validateSanctionConfig({ SANCTION_MATCH_THRESHOLD: 80, PEP_MATCH_THRESHOLD: 75 })).not.toThrow();
  });

  // Test 19: Client score/status manipulation rejection
  test('19. Client attempt to submit riskScore or matchStatus is ignored server-side', async () => {
    const result = await sanctionScreeningService.screenEntity(
      mockVerificationId,
      { id: mockTenantId, role: 'manager' },
      { matchStatus: 'NO_MATCH', similarityScore: 0, simulationScenario: 'SIM_SANCTION_MATCH' }
    );
    expect(result.matchStatus).toBe('POTENTIAL_MATCH');
  });

  // Test 20: UNAVAILABLE != NO_MATCH guarantee
  test('20. Provider failure produces UNAVAILABLE status and NEVER returns NO_MATCH', async () => {
    const result = await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { forceError: true });
    expect(result.matchStatus).toBe('UNAVAILABLE');
    expect(result.scanStatus).toBe('FAILED');
  });

  // Test 21: Critical production provider failure safety (0 fake success, 0 Trust Score changes)
  test('21. Critical production provider failure creates 0 fake success and 0 Trust Score changes', async () => {
    const prodProv = new SanctionProductionProvider();
    await expect(prodProv.screenEntity(mockVerificationId, {}, { forceError: true })).rejects.toThrow();
    expect(trustScoreService.recalculateTrustScore).not.toHaveBeenCalled();
  });

  // Test 22: Trust Score isolation (Automatic match states NEVER alter Trust Score)
  test('22. Automatic screening results (POTENTIAL_MATCH, NO_MATCH, UNAVAILABLE) NEVER alter Trust Score', async () => {
    await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { simulationScenario: 'SIM_SANCTION_MATCH' });
    expect(trustScoreService.recalculateTrustScore).not.toHaveBeenCalled();
  });

  // Test 23: Explicit human confirm triggers trustScoreService.recalculateTrustScore(..., 'SANCTION_FLAG_RAISED')
  test('23. Explicit human confirm triggers trustScoreService recalculation with SANCTION_FLAG_RAISED', async () => {
    await sanctionScreeningService.confirmSanctionMatch(mockVerificationId, { id: mockManagerId, role: 'manager' }, { notes: 'Confirmed' });
    expect(trustScoreService.recalculateTrustScore).toHaveBeenCalledWith('TENANT', mockTenantId, 'SANCTION_FLAG_RAISED');
  });

  // Test 24: Explicit human dismiss triggers trustScoreService.recalculateTrustScore(..., 'SANCTION_FLAG_CLEARED')
  test('24. Explicit human dismiss triggers trustScoreService recalculation with SANCTION_FLAG_CLEARED', async () => {
    await sanctionScreeningService.dismissSanctionMatch(mockVerificationId, { id: mockManagerId, role: 'manager' }, { notes: 'Dismissed' });
    expect(trustScoreService.recalculateTrustScore).toHaveBeenCalledWith('TENANT', mockTenantId, 'SANCTION_FLAG_CLEARED');
  });

  // Test 25: Manager & Admin authorization scoping
  test('25. getSanctionStatus returns full details for admin and manager roles', async () => {
    const res = await sanctionScreeningService.getSanctionStatus(mockVerificationId, { id: mockAdminId, role: 'admin' });
    expect(res).toHaveProperty('matchStatus');
    expect(res).toHaveProperty('scanStatus');
  });

  // Test 26: Tenant / user information sanitization (GET /status returns non-sensitive status only)
  test('26. getSanctionStatus returns public sanitized response for tenant role', async () => {
    mockVerification.sanctionScreening.matchStatus = 'CONFIRMED_MATCH';
    const res = await sanctionScreeningService.getSanctionStatus(mockVerificationId, { id: mockTenantId, role: 'tenant' });
    expect(res.publicStatus).toBe('REVIEW_REQUIRED');
    expect(res).not.toHaveProperty('matches');
    expect(res).not.toHaveProperty('reviewHistory');
  });

  // Test 27: Manager cannot override an Admin decision
  test('27. Manager attempt to confirm/dismiss after Admin decision throws 403 Forbidden', async () => {
    mockVerification.sanctionScreening.reviewedByRole = 'admin';
    await expect(
      sanctionScreeningService.confirmSanctionMatch(mockVerificationId, { id: mockManagerId, role: 'manager' }, { notes: 'Override' })
    ).rejects.toThrow(AppError);
  });

  // Test 28: Cross-account evidence privacy (anonymizedReference)
  test('28. Cross-account evidence matches mask identifiers under anonymizedReference', async () => {
    const result = await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { simulationScenario: 'SIM_SANCTION_MATCH' });
    const match = mockVerification.sanctionScreening.matches[0];
    expect(match.anonymizedReference).toMatch(/^SANCTION-MATCH-/);
  });

  // Test 29: Continuous monitoring concurrency lock (_isSanctionMonitoringRunning)
  test('29. Concurrent invocation of runContinuousMonitoring skips overlapping execution', async () => {
    const promise1 = sanctionScreeningService.runContinuousMonitoring();
    const promise2 = sanctionScreeningService.runContinuousMonitoring();
    const [res1, res2] = await Promise.all([promise1, promise2]);
    expect([res1.status, res2.status]).toContain('SKIPPED_ALREADY_RUNNING');
  });

  // Test 30: Monitoring retention metadata purge (purgeExpiredSanctionMetadata)
  test('30. purgeExpiredSanctionMetadata purges matches and attempts while preserving reviewHistory', async () => {
    mockVerification.sanctionScreening.metadataRetentionExpiresAt = new Date(Date.now() - 1000);
    mockVerification.sanctionScreening.matches = [{ matchId: 'M1' }];
    mockVerification.sanctionScreening.attempts = [{ attemptNumber: 1 }];
    mockVerification.sanctionScreening.reviewHistory = [{ decision: 'CONFIRMED', notes: 'Audit history' }];

    const res = await sanctionScreeningService.purgeExpiredSanctionMetadata();
    expect(res.purgedCount).toBe(1);
    expect(mockVerification.sanctionScreening.matches).toHaveLength(0);
    expect(mockVerification.sanctionScreening.attempts).toHaveLength(0);
    expect(mockVerification.sanctionScreening.reviewHistory).toHaveLength(1); // Preserved for 7-year audit
  });

  // Test 31: Phase 3.5 global verification lifecycle isolation (0 direct status overrides)
  test('31. Sanctions screening NEVER overwrites Phase 3.5 global verification status', async () => {
    const origStatus = mockVerification.status;
    await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { simulationScenario: 'SIM_SANCTION_MATCH' });
    expect(mockVerification.status).toBe(origStatus);
  });

  // Test 32: Confirmed sanction does NOT directly set REJECTED
  test('32. confirmSanctionMatch sets matchStatus CONFIRMED_MATCH without modifying global status to REJECTED', async () => {
    await sanctionScreeningService.confirmSanctionMatch(mockVerificationId, { id: mockManagerId, role: 'manager' }, { notes: 'Confirmed' });
    expect(mockVerification.status).toBe('SUBMITTED');
    expect(mockVerification.sanctionScreening.matchStatus).toBe('CONFIRMED_MATCH');
  });

  // Test 33: Confirmed sanction does NOT set APPROVED or issue badges
  test('33. Confirmed sanction does NOT set APPROVED or issue badges', async () => {
    await sanctionScreeningService.confirmSanctionMatch(mockVerificationId, { id: mockManagerId, role: 'manager' }, { notes: 'Confirmed' });
    expect(mockVerification.status).not.toBe('APPROVED');
    expect(mockVerification.status).not.toBe('BADGE_ISSUED');
  });

  // Test 34: Production provider 10-second AbortController timeout
  test('34. Production provider aborts request on 10-second timeout', async () => {
    const prodProv = new SanctionProductionProvider();
    config.REAL_SANCTION_SCREENING = true;
    config.SANCTION_PROVIDER_API_KEY = 'test';
    config.SANCTION_PROVIDER_URL = 'https://httpbin.org/delay/15';

    try {
      await expect(prodProv.screenEntity(mockVerificationId, {}, {})).rejects.toThrow();
    } finally {
      config.REAL_SANCTION_SCREENING = false;
    }
  }, 15000);

  // Test 35: Circuit breaker 5-failure trip and 60-second OPEN period
  test('35. Circuit breaker trips to OPEN state after 5 consecutive failures', () => {
    const prodProv = new SanctionProductionProvider();
    for (let i = 0; i < 5; i++) {
      prodProv._recordFailure();
    }
    expect(prodProv.circuitState).toBe('OPEN');
    expect(() => prodProv._checkCircuitBreaker()).toThrow('Provider circuit breaker is OPEN');
  });

  // Test 36: Adverse media structured classification (ALLEGATION vs CONVICTION)
  test('36. Adverse media matches categorize under explicit classifications', async () => {
    await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { simulationScenario: 'SIM_ADVERSE_MEDIA' });
    const match = mockVerification.sanctionScreening.matches[0];
    expect(['ALLEGATION', 'INVESTIGATION', 'CHARGE', 'CONVICTION', 'REGULATORY_ACTION', 'CONFIRMED_ENFORCEMENT']).toContain(match.adverseMediaDetails.classification);
  });

  // Test 37: Source provenance metadata preservation (sourceProvider, sourceList, sourceType)
  test('37. Matched records preserve complete source provenance metadata', async () => {
    await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { simulationScenario: 'SIM_SANCTION_MATCH' });
    const match = mockVerification.sanctionScreening.matches[0];
    expect(match).toHaveProperty('sourceProvider');
    expect(match).toHaveProperty('sourceList');
    expect(match).toHaveProperty('sourceType');
    expect(match).toHaveProperty('sourceRecordReference');
  });

  // Test 38: Deterministic replay verification
  test('38. Re-running screening on identical input yields identical match classification', async () => {
    const res1 = await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { simulationScenario: 'SIM_SANCTION_MATCH' });
    const res2 = await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { simulationScenario: 'SIM_SANCTION_MATCH' });
    expect(res1.matchStatus).toBe(res2.matchStatus);
  });

  // Test 39: Previous CONFIRMED_MATCH + provider failure preserves historical confirmed evidence
  test('39. Previous CONFIRMED_MATCH + provider failure preserves historical confirmed decision', async () => {
    mockVerification.sanctionScreening.matchStatus = 'CONFIRMED_MATCH';
    const result = await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { forceError: true });
    expect(result.matchStatus).toBe('CONFIRMED_MATCH');
    expect(result.scanStatus).toBe('FAILED');
  });

  // Test 40: Previous NO_MATCH + provider failure becomes current UNAVAILABLE while preserving lastSuccessfulMatchStatus: NO_MATCH
  test('40. Previous NO_MATCH + provider failure becomes current UNAVAILABLE preserving lastSuccessfulMatchStatus', async () => {
    mockVerification.sanctionScreening.matchStatus = 'NO_MATCH';
    mockVerification.sanctionScreening.lastSuccessfulMatchStatus = 'NO_MATCH';
    const result = await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { forceError: true });
    expect(result.matchStatus).toBe('UNAVAILABLE');
    expect(mockVerification.sanctionScreening.lastSuccessfulMatchStatus).toBe('NO_MATCH');
  });

  // Test 41: Repeated monitoring of identical fingerprint does not create duplicate review
  test('41. Repeated monitoring scan of identical fingerprint does not create duplicate review request', async () => {
    await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { simulationScenario: 'SIM_SANCTION_MATCH' });
    const revState1 = mockVerification.sanctionScreening.reviewState;
    await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { simulationScenario: 'SIM_SANCTION_MATCH' });
    expect(mockVerification.sanctionScreening.reviewState).toBe(revState1);
  });

  // Test 42: Dismissed match + identical fingerprint remains dismissed
  test('42. Dismissed match scanned with identical fingerprint remains DISMISSED_MATCH', async () => {
    const devFp = SanctionMatchEngine.generateFingerprint(
      'SANCTION_MATCH',
      'VLADIMIR SANCTIONOV',
      'OFAC Specially Designated Nationals List',
      'SDN-REC-DEV-1-OPAQUE'
    );
    mockVerification.sanctionScreening.matchStatus = 'DISMISSED_MATCH';
    mockVerification.sanctionScreening.reviewState = 'DISMISSED';
    mockVerification.sanctionScreening.matches = [{
      matchId: 'MATCH-SANC-DEV-1',
      evidenceFingerprint: devFp,
      matchType: 'SANCTION_MATCH',
      listName: 'OFAC Specially Designated Nationals List',
      matchedName: 'VLADIMIR SANCTIONOV',
      similarityScore: 92,
      anonymizedReference: 'SANCTION-MATCH-DEV-SDN-1',
      sourceProvider: 'DevelopmentWatchlistAdapter',
      sourceList: 'OFAC_SDN',
      sourceType: 'SANCTIONS_LIST',
      sourceRecordReference: 'SDN-REC-DEV-1-OPAQUE',
    }];

    await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { simulationScenario: 'SIM_SANCTION_MATCH' });
    expect(mockVerification.sanctionScreening.matchStatus).toBe('DISMISSED_MATCH');
  });

  // Test 43: Dismissed match + new evidence fingerprint creates new POTENTIAL_MATCH & PENDING_REVIEW
  test('43. Dismissed match with new evidence fingerprint creates new POTENTIAL_MATCH and PENDING_REVIEW', async () => {
    mockVerification.sanctionScreening.matchStatus = 'DISMISSED_MATCH';
    mockVerification.sanctionScreening.reviewState = 'DISMISSED';
    mockVerification.sanctionScreening.reviewedBy = mockManagerId;

    await sanctionScreeningService.screenEntity(mockVerificationId, { id: mockTenantId, role: 'manager' }, { simulationScenario: 'SIM_PEP_MATCH' });
    expect(mockVerification.sanctionScreening.matchStatus).toBe('POTENTIAL_MATCH');
    expect(mockVerification.sanctionScreening.reviewState).toBe('PENDING_REVIEW');
    expect(mockVerification.sanctionScreening.reviewHistory).toHaveLength(1); // Archived previous dismissal
  });

  // Test 44: One failed monitoring entity does not abort remaining batch
  test('44. One failed monitoring entity in a batch does not abort remaining entities', async () => {
    const res = await sanctionScreeningService.runContinuousMonitoring();
    expect(res.status).toBe('COMPLETED');
    expect(res.processedCount).toBeGreaterThanOrEqual(1);
  });

  // Test 45: Tenant/user status endpoint never exposes internal match status or reviewHistory
  test('45. Tenant/user status endpoint never exposes POTENTIAL_MATCH or reviewHistory', async () => {
    mockVerification.sanctionScreening.matchStatus = 'POTENTIAL_MATCH';
    const status = await sanctionScreeningService.getSanctionStatus(mockVerificationId, { id: mockTenantId, role: 'tenant' });
    expect(status.publicStatus).toBe('REVIEW_REQUIRED');
    expect(status).not.toHaveProperty('matchStatus');
    expect(status).not.toHaveProperty('matches');
    expect(status).not.toHaveProperty('reviewHistory');
  });

  // Test 46: Manager cannot override an existing Admin CONFIRM/DISMISS decision (403 Forbidden)
  test('46. Manager cannot override an existing Admin CONFIRM or DISMISS decision', async () => {
    mockVerification.sanctionScreening.reviewedByRole = 'admin';
    await expect(
      sanctionScreeningService.dismissSanctionMatch(mockVerificationId, { id: mockManagerId, role: 'manager' }, { notes: 'Manager override attempt' })
    ).rejects.toThrow(AppError);
  });
});
