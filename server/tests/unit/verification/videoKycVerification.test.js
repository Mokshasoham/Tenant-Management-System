import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import mongoose from 'mongoose';
import Verification from '../../../src/models/Verification.js';
import verificationRepository from '../../../src/repositories/verificationRepository.js';
import videoKycService from '../../../src/services/videoKycService.js';
import verificationService from '../../../src/services/verificationService.js';
import trustScoreService from '../../../src/services/trustScoreService.js';
import config from '../../../src/config/config.js';
import { AppError } from '../../../src/utils/errorHandling.js';

describe('Phase 3.6.5 — Video KYC & Agent Assisted Verification Unit Tests', () => {
  let mockVerification;
  const mockTenantId = new mongoose.Types.ObjectId().toString();
  const mockAgentId = new mongoose.Types.ObjectId().toString();
  const mockUnauthorizedAgentId = new mongoose.Types.ObjectId().toString();
  const mockAdminId = new mongoose.Types.ObjectId().toString();

  beforeEach(async () => {
    jest.clearAllMocks();
    config.REAL_VIDEO_KYC_VERIFICATION = false;
    config.CURRENT_VIDEO_KYC_CONSENT_VERSION = 'v1.0';
    config.VIDEO_KYC_SAVE_RECORDING = false;

    mockVerification = new Verification({
      _id: new mongoose.Types.ObjectId(),
      verificationNumber: 'VRF-2026-VKYC01',
      entityType: 'TENANT',
      entityId: mockTenantId,
      profile: 'TENANT_STANDARD',
      status: 'SUBMITTED',
      isLatestVersion: true,
      timeline: [],
      videoKycConsent: {
        consentStatus: 'NONE',
        consentVersion: 'v1.0',
      },
      videoKycVerification: {
        provider: 'development',
        sessionStatus: 'NOT_STARTED',
        verificationStatus: 'NOT_STARTED',
        attempts: [],
      },
    });

    jest.spyOn(verificationRepository, 'findById').mockImplementation((id) => {
      if (id && id.toString() === mockVerification._id.toString()) {
        return Promise.resolve(mockVerification);
      }
      return Promise.resolve(null);
    });

    jest.spyOn(mockVerification, 'save').mockImplementation(() => Promise.resolve(mockVerification));
    jest.spyOn(trustScoreService, 'recalculateTrustScore').mockResolvedValue({ score: 90, delta: 15 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('1. Consent & Version Policy: Grant consent, validate active version, and handle revocation', async () => {
    // Grant consent
    const updated = await videoKycService.grantConsent(
      mockVerification._id.toString(),
      { videoRecordingConsent: true, geolocationConsent: true, audioConsent: true },
      mockTenantId,
      '127.0.0.1'
    );

    expect(updated.videoKycConsent.consentStatus).toBe('GRANTED');
    expect(updated.videoKycConsent.consentVersion).toBe('v1.0');
    expect(updated.videoKycConsent.videoRecordingConsent).toBe(true);

    // Revoke consent
    const revoked = await videoKycService.revokeConsent(mockVerification._id.toString(), mockTenantId);
    expect(revoked.videoKycConsent.consentStatus).toBe('REVOKED');
  });

  test('2. Consent Version Mismatch: Outdated consent triggers RECONSENT_REQUIRED', async () => {
    mockVerification.videoKycConsent = {
      consentStatus: 'GRANTED',
      consentVersion: 'v0.9', // Outdated
      consentPurpose: 'Old Purpose',
    };

    await expect(
      videoKycService.createSession(mockVerification._id.toString(), {}, mockTenantId, 'tenant')
    ).rejects.toThrow(/consent policy has updated to v1.0/i);

    expect(mockVerification.videoKycConsent.consentStatus).toBe('RECONSENT_REQUIRED');
  });

  test('3. WebRTC Session Creation & Token Security: Generates scoped short-lived room token', async () => {
    mockVerification.videoKycConsent = {
      consentStatus: 'GRANTED',
      consentVersion: 'v1.0',
    };

    const sessionRes = await videoKycService.createSession(
      mockVerification._id.toString(),
      { geolocation: { latitude: 12.97, longitude: 77.59, city: 'Bengaluru', country: 'India' } },
      mockTenantId,
      'tenant'
    );

    expect(sessionRes.sessionId).toMatch(/^VKYC-DEV-/);
    expect(sessionRes.roomToken).toContain(sessionRes.sessionId);
    expect(sessionRes.sessionStatus).toBe('WAITING_FOR_AGENT');
    expect(mockVerification.videoKycVerification.verificationStatus).toBe('PENDING');
  });

  test('4. Zero Recording Persistence by Default: VIDEO_KYC_SAVE_RECORDING=false stores no media URLs', async () => {
    mockVerification.videoKycConsent = { consentStatus: 'GRANTED', consentVersion: 'v1.0' };
    mockVerification.videoKycVerification.sessionId = 'VKYC-DEV-12345';
    mockVerification.videoKycVerification.sessionStatus = 'IN_PROGRESS';
    mockVerification.videoKycVerification.assignedAgentId = mockAgentId;

    config.VIDEO_KYC_SAVE_RECORDING = false;

    await videoKycService.submitEvaluation(
      mockVerification._id.toString(),
      { agentNotes: 'All clear', recordingUrl: 'https://storage.provider.local/video.mp4' },
      mockAgentId,
      'manager'
    );

    expect(mockVerification.videoKycVerification.recordingUrl).toBe('');
    expect(mockVerification.videoKycVerification.isRecordingSaved).toBe(false);
    expect(mockVerification.videoKycVerification.encryptedSessionToken).toBe(''); // Token invalidated
  });

  test('5. Agent RBAC & Audit Trail: Unauthorized agent evaluation throws 403 Forbidden', async () => {
    mockVerification.videoKycConsent = { consentStatus: 'GRANTED', consentVersion: 'v1.0' };
    mockVerification.videoKycVerification.sessionId = 'VKYC-DEV-12345';
    mockVerification.videoKycVerification.assignedAgentId = mockAgentId;

    await expect(
      videoKycService.submitEvaluation(
        mockVerification._id.toString(),
        { agentNotes: 'Fraud' },
        mockUnauthorizedAgentId,
        'user' // Unauthorized role
      )
    ).rejects.toThrow(/Unauthorized/i);
  });

  test('6. Production Provider Credentials Failure: REAL_VIDEO_KYC_VERIFICATION=true throws 500 AppError when credentials missing', async () => {
    config.REAL_VIDEO_KYC_VERIFICATION = true;
    config.VIDEO_KYC_PROVIDER_API_KEY = '';

    expect(() => videoKycService.getProvider()).toThrow(/Production Video KYC credentials are not configured/i);
  });

  test('7. Production Provider Error Handling: Timeout or HTTP error NEVER returns fake VERIFIED', async () => {
    mockVerification.videoKycConsent = { consentStatus: 'GRANTED', consentVersion: 'v1.0' };
    mockVerification.videoKycVerification.sessionId = 'VKYC-DEV-12345';
    mockVerification.videoKycVerification.assignedAgentId = mockAgentId;

    await videoKycService.submitEvaluation(
      mockVerification._id.toString(),
      { forceTimeout: true },
      mockAgentId,
      'manager'
    );

    expect(mockVerification.videoKycVerification.verificationStatus).toBe('UNAVAILABLE');
    expect(trustScoreService.recalculateTrustScore).not.toHaveBeenCalled();
  });

  test('8. Concurrency Guard: Active session suppresses duplicate session creation', async () => {
    mockVerification.videoKycConsent = { consentStatus: 'GRANTED', consentVersion: 'v1.0' };
    mockVerification.videoKycVerification.sessionId = 'VKYC-DEV-EXISTING';
    mockVerification.videoKycVerification.sessionStatus = 'IN_PROGRESS';

    const duplicateRes = await videoKycService.createSession(
      mockVerification._id.toString(),
      {},
      mockTenantId,
      'tenant'
    );

    expect(duplicateRes.sessionId).toBe('VKYC-DEV-EXISTING');
    expect(duplicateRes.sessionStatus).toBe('IN_PROGRESS');
  });

  test('9. Scheduled Session Reconciliation: Marks abandoned WAITING_FOR_AGENT sessions as EXPIRED', async () => {
    jest.spyOn(Verification, 'updateMany').mockResolvedValue({ modifiedCount: 2 });

    const reconRes = await videoKycService.reconcileAbandonedSessions();
    expect(reconRes.modifiedCount).toBe(2);
  });

  test('10. Successful Verification Trust Score Integration: Triggers VIDEO_KYC_VERIFIED recalculation', async () => {
    mockVerification.videoKycConsent = { consentStatus: 'GRANTED', consentVersion: 'v1.0' };
    mockVerification.videoKycVerification.sessionId = 'VKYC-DEV-SUCCESS';
    mockVerification.videoKycVerification.assignedAgentId = mockAgentId;

    await videoKycService.submitEvaluation(
      mockVerification._id.toString(),
      { agentNotes: 'Verified' },
      mockAgentId,
      'manager'
    );

    expect(mockVerification.videoKycVerification.verificationStatus).toBe('VERIFIED');
    expect(trustScoreService.recalculateTrustScore).toHaveBeenCalledWith(
      'TENANT',
      mockTenantId,
      'VIDEO_KYC_VERIFIED'
    );
  });
});
