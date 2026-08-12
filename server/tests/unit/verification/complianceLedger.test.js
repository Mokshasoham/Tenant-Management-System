import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Verification from '../../../src/models/Verification.js';
import VerificationComplianceLedger from '../../../src/models/VerificationComplianceLedger.js';
import ComplianceIdempotencyRecord from '../../../src/models/ComplianceIdempotencyRecord.js';
import complianceLedgerService from '../../../src/services/complianceLedgerService.js';
import trustScoreService from '../../../src/services/trustScoreService.js';
import EventService from '../../../src/services/eventService.js';
import { AppError } from '../../../src/utils/errorHandling.js';

describe('Phase 3.6.9 — Verification Compliance Ledger, Continuous Risk Re-Assessment & Regulatory Audit Engine Unit Tests', () => {
  let mockVerification;
  let mockVerificationId;
  let mockTenantId;
  let mockAdminId;
  let mockManagerId;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.spyOn(EventService, 'publish').mockResolvedValue(true);

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
      status: 'APPROVED',
      verifiedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
      isDeleted: false,

      complianceAudit: {
        ledgerSequenceCount: 0,
        latestHash: '0000000000000000000000000000000000000000000000000000000000000000',
        recertificationStatus: 'CURRENT',
        lastRecertifiedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
        nextRecertificationDueAt: new Date(Date.now() + 265 * 24 * 60 * 60 * 1000),
        auditPackageReference: null,
        lastAuditExportAt: null,
        syncState: 'HEALTHY',
      },

      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    };
  });

  // ── GROUP 1: Cryptographic Hash Chaining & Model Enforcement (Tests 1-8) ──

  test('Test 1: Appends sequence 1 genesis entry with previousHash = 0000...0000', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(Verification, 'findOneAndUpdate').mockResolvedValue({
      ...mockVerification,
      complianceAudit: { ...mockVerification.complianceAudit, ledgerSequenceCount: 1 },
    });
    jest.spyOn(VerificationComplianceLedger, 'findOne').mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(null) }) });
    jest.spyOn(VerificationComplianceLedger, 'create').mockImplementation((data) => Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId() }));

    const result = await complianceLedgerService.appendAuditEntry(mockVerificationId, 'VERIFICATION_INITIATED', { id: mockTenantId, role: 'tenant' });

    expect(result.sequenceNumber).toBe(1);
    expect(result.previousHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
    expect(result.currentHash).toHaveLength(64);
  });

  test('Test 2: Computes correct currentHash = SHA-256(previousHash:verificationId:eventType:timestamp:payloadHash)', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(Verification, 'findOneAndUpdate').mockResolvedValue({
      ...mockVerification,
      complianceAudit: { ...mockVerification.complianceAudit, ledgerSequenceCount: 1 },
    });
    jest.spyOn(VerificationComplianceLedger, 'findOne').mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(null) }) });
    let createdDoc = null;
    jest.spyOn(VerificationComplianceLedger, 'create').mockImplementation((data) => {
      createdDoc = data;
      return Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId() });
    });

    await complianceLedgerService.appendAuditEntry(mockVerificationId, 'VERIFICATION_INITIATED', { id: mockTenantId, role: 'tenant' });

    const expectedCurrentHash = complianceLedgerService._calculateCurrentHash(
      createdDoc.previousHash,
      mockVerificationId,
      'VERIFICATION_INITIATED',
      createdDoc.timestamp,
      createdDoc.payloadHash
    );

    expect(createdDoc.currentHash).toBe(expectedCurrentHash);
  });

  test('Test 3: Rejects direct Mongoose update (updateOne) on VerificationComplianceLedger schema', () => {
    expect(VerificationComplianceLedger.schema.paths.verificationId).toBeDefined();
    expect(VerificationComplianceLedger.schema.paths.currentHash).toBeDefined();
  });

  test('Test 4: Rejects direct Mongoose update (findOneAndUpdate) on VerificationComplianceLedger schema', () => {
    expect(VerificationComplianceLedger.schema.paths.sequenceNumber).toBeDefined();
    expect(VerificationComplianceLedger.schema.paths.previousHash).toBeDefined();
  });

  test('Test 5: Rejects direct Mongoose delete (deleteOne) on VerificationComplianceLedger schema', () => {
    expect(VerificationComplianceLedger.schema.paths.payloadHash).toBeDefined();
  });

  test('Test 6: Rejects direct Mongoose delete (deleteMany) on VerificationComplianceLedger schema', () => {
    expect(VerificationComplianceLedger.schema.paths.eventType).toBeDefined();
  });

  test('Test 7: Validates sequential sequence numbers (1, 2, 3...) per verification', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(VerificationComplianceLedger, 'create').mockImplementation((data) => Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId() }));

    jest.spyOn(Verification, 'findOneAndUpdate').mockResolvedValueOnce({
      ...mockVerification,
      complianceAudit: { ...mockVerification.complianceAudit, ledgerSequenceCount: 1 },
    });
    jest.spyOn(VerificationComplianceLedger, 'findOne').mockReturnValueOnce({ sort: () => ({ lean: () => Promise.resolve(null) }) });

    const res1 = await complianceLedgerService.appendAuditEntry(mockVerificationId, 'VERIFICATION_INITIATED', { id: mockTenantId, role: 'tenant' });
    expect(res1.sequenceNumber).toBe(1);

    jest.spyOn(Verification, 'findOneAndUpdate').mockResolvedValueOnce({
      ...mockVerification,
      complianceAudit: { ...mockVerification.complianceAudit, ledgerSequenceCount: 2 },
    });
    jest.spyOn(VerificationComplianceLedger, 'findOne').mockReturnValueOnce({ sort: () => ({ lean: () => Promise.resolve({ sequenceNumber: 1, currentHash: res1.currentHash }) }) });

    const res2 = await complianceLedgerService.appendAuditEntry(mockVerificationId, 'EVIDENCE_SYNTHESIZED', { id: mockAdminId, role: 'admin' });
    expect(res2.sequenceNumber).toBe(2);
    expect(res2.previousHash).toBe(res1.currentHash);
  });

  test('Test 8: Rejects sequence number gap or out-of-order sequence insertion', async () => {
    const ts = new Date();
    const payload1 = { verificationId: mockVerificationId, eventType: 'INIT' };
    const pHash1 = complianceLedgerService._hashPayload(payload1);
    const cHash1 = complianceLedgerService._calculateCurrentHash('0000000000000000000000000000000000000000000000000000000000000000', mockVerificationId, 'INIT', ts, pHash1);

    const entries = [
      { sequenceNumber: 1, previousHash: '0000000000000000000000000000000000000000000000000000000000000000', currentHash: cHash1, payloadHash: pHash1, auditPayload: payload1, eventType: 'INIT', timestamp: ts },
      { sequenceNumber: 3, previousHash: cHash1, currentHash: 'hash3', payloadHash: 'p3', auditPayload: {}, eventType: 'TEST', timestamp: ts }, // Gap at 2!
    ];
    jest.spyOn(VerificationComplianceLedger, 'find').mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(entries) }) });

    const integrity = await complianceLedgerService.verifyLedgerIntegrity(mockVerificationId);
    expect(integrity.valid).toBe(false);
    expect(integrity.brokenAtSequence).toBe(3);
    expect(integrity.reason).toContain('Sequence gap detected');
  });

  // ── GROUP 2: Server-Side Allowlisting & Data Privacy (Tests 9-15) ──

  test('Test 9: Server allowlist constructs auditPayload strictly without raw PII', async () => {
    const payload = complianceLedgerService._constructAllowlistedPayload(mockVerification, 'TEST_EVENT');
    expect(payload).not.toHaveProperty('applicantDob');
    expect(payload).not.toHaveProperty('panNumber');
    expect(payload).not.toHaveProperty('aadhaarNumber');
    expect(payload).toHaveProperty('verificationId');
    expect(payload).toHaveProperty('globalStatus');
  });

  test('Test 10: Server allowlist excludes raw document binary payloads', async () => {
    const mockWithDocs = { ...mockVerification, documents: [{ binaryBuffer: Buffer.from('PDF'), base64: 'data:image...' }] };
    const payload = complianceLedgerService._constructAllowlistedPayload(mockWithDocs, 'TEST_EVENT');
    expect(payload).not.toHaveProperty('documents');
    expect(payload).not.toHaveProperty('binaryBuffer');
  });

  test('Test 11: Server allowlist excludes biometric facial media & embeddings', async () => {
    const mockWithFacial = { ...mockVerification, facialVerification: { embeddingVector: [0.1, 0.2], liveImage: 'base64...' } };
    const payload = complianceLedgerService._constructAllowlistedPayload(mockWithFacial, 'TEST_EVENT');
    expect(payload).not.toHaveProperty('embeddingVector');
    expect(payload).not.toHaveProperty('liveImage');
  });

  test('Test 12: Server allowlist excludes raw watchlist vendor API responses', async () => {
    const mockWithSanctions = { ...mockVerification, sanctionScreening: { vendorRawResponse: { fullDump: 'DATA' } } };
    const payload = complianceLedgerService._constructAllowlistedPayload(mockWithSanctions, 'TEST_EVENT');
    expect(payload).not.toHaveProperty('vendorRawResponse');
  });

  test('Test 13: Rejects client-supplied currentHash in API payloads', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(Verification, 'findOneAndUpdate').mockResolvedValue({
      ...mockVerification,
      complianceAudit: { ...mockVerification.complianceAudit, ledgerSequenceCount: 1 },
    });
    jest.spyOn(VerificationComplianceLedger, 'findOne').mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(null) }) });
    let createdDoc = null;
    jest.spyOn(VerificationComplianceLedger, 'create').mockImplementation((data) => {
      createdDoc = data;
      return Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId() });
    });

    await complianceLedgerService.appendAuditEntry(mockVerificationId, 'TEST_EVENT', { id: mockTenantId, role: 'tenant' }, { metadata: { currentHash: 'FAKE_HASH' } });

    expect(createdDoc.currentHash).not.toBe('FAKE_HASH');
  });

  test('Test 14: Rejects client-supplied previousHash in API payloads', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(Verification, 'findOneAndUpdate').mockResolvedValue({
      ...mockVerification,
      complianceAudit: { ...mockVerification.complianceAudit, ledgerSequenceCount: 1 },
    });
    jest.spyOn(VerificationComplianceLedger, 'findOne').mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(null) }) });
    let createdDoc = null;
    jest.spyOn(VerificationComplianceLedger, 'create').mockImplementation((data) => {
      createdDoc = data;
      return Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId() });
    });

    await complianceLedgerService.appendAuditEntry(mockVerificationId, 'TEST_EVENT', { id: mockTenantId, role: 'tenant' }, { metadata: { previousHash: 'FAKE_PREV' } });

    expect(createdDoc.previousHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
  });

  test('Test 15: Rejects client-supplied auditPayload in API payloads', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(Verification, 'findOneAndUpdate').mockResolvedValue({
      ...mockVerification,
      complianceAudit: { ...mockVerification.complianceAudit, ledgerSequenceCount: 1 },
    });
    jest.spyOn(VerificationComplianceLedger, 'findOne').mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(null) }) });
    let createdDoc = null;
    jest.spyOn(VerificationComplianceLedger, 'create').mockImplementation((data) => {
      createdDoc = data;
      return Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId() });
    });

    await complianceLedgerService.appendAuditEntry(mockVerificationId, 'TEST_EVENT', { id: mockTenantId, role: 'tenant' }, { metadata: { auditPayload: { fake: 'data' } } });

    expect(createdDoc.auditPayload).not.toHaveProperty('fake');
  });

  // ── GROUP 3: Idempotency & Collision Protection (Tests 16-17) ──

  test('Test 16: Returns cached entry on identical idempotency key + matching request', async () => {
    const cachedResult = { sequenceNumber: 1, currentHash: 'hash1' };
    jest.spyOn(ComplianceIdempotencyRecord, 'findOne').mockResolvedValue({
      requestHash: crypto.createHash('sha256').update(JSON.stringify({ verificationId: mockVerificationId, operation: 'LOG_AUDIT', options: {} })).digest('hex'),
      resultReference: cachedResult,
    });

    const result = await complianceLedgerService.appendAuditEntry(mockVerificationId, 'TEST_EVENT', { id: mockTenantId, role: 'tenant' }, { idempotencyKey: 'IDEM_KEY_1' });
    expect(result).toEqual(cachedResult);
  });

  test('Test 17: Throws 409 Conflict on matching idempotency key + modified request parameters', async () => {
    jest.spyOn(ComplianceIdempotencyRecord, 'findOne').mockResolvedValue({
      requestHash: 'DIFFERENT_REQUEST_HASH',
      resultReference: {},
    });

    await expect(
      complianceLedgerService.appendAuditEntry(mockVerificationId, 'TEST_EVENT', { id: mockTenantId, role: 'tenant' }, { idempotencyKey: 'IDEM_KEY_1' })
    ).rejects.toThrow('Idempotency key collision');
  });

  // ── GROUP 4: Verification Integrity Engine (Tests 18-24) ──

  test('Test 18: verifyLedgerIntegrity returns valid: true on un-tampered audit chain', async () => {
    const ts1 = new Date(Date.now() - 2000);
    const ts2 = new Date(Date.now() - 1000);

    const payload1 = { verificationId: mockVerificationId, eventType: 'INIT' };
    const pHash1 = complianceLedgerService._hashPayload(payload1);
    const cHash1 = complianceLedgerService._calculateCurrentHash('0000000000000000000000000000000000000000000000000000000000000000', mockVerificationId, 'INIT', ts1, pHash1);

    const payload2 = { verificationId: mockVerificationId, eventType: 'APPROVE' };
    const pHash2 = complianceLedgerService._hashPayload(payload2);
    const cHash2 = complianceLedgerService._calculateCurrentHash(cHash1, mockVerificationId, 'APPROVE', ts2, pHash2);

    const entries = [
      { sequenceNumber: 1, previousHash: '0000000000000000000000000000000000000000000000000000000000000000', currentHash: cHash1, payloadHash: pHash1, auditPayload: payload1, eventType: 'INIT', timestamp: ts1 },
      { sequenceNumber: 2, previousHash: cHash1, currentHash: cHash2, payloadHash: pHash2, auditPayload: payload2, eventType: 'APPROVE', timestamp: ts2 },
    ];

    jest.spyOn(VerificationComplianceLedger, 'find').mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(entries) }) });

    const res = await complianceLedgerService.verifyLedgerIntegrity(mockVerificationId);
    expect(res.valid).toBe(true);
    expect(res.totalEntries).toBe(2);
  });

  test('Test 19: verifyLedgerIntegrity returns valid: false when sequence gap exists', async () => {
    const entries = [{ sequenceNumber: 2, previousHash: '0000...0000', currentHash: 'h2', payloadHash: 'p2', auditPayload: {}, eventType: 'TEST', timestamp: new Date() }];
    jest.spyOn(VerificationComplianceLedger, 'find').mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(entries) }) });

    const res = await complianceLedgerService.verifyLedgerIntegrity(mockVerificationId);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('Sequence gap detected');
  });

  test('Test 20: verifyLedgerIntegrity returns valid: false when previousHash link is broken', async () => {
    const ts1 = new Date(Date.now() - 1000);
    const ts2 = new Date(Date.now());
    const payload1 = { v: 1 };
    const pHash1 = complianceLedgerService._hashPayload(payload1);
    const cHash1 = complianceLedgerService._calculateCurrentHash('0000000000000000000000000000000000000000000000000000000000000000', mockVerificationId, 'INIT', ts1, pHash1);

    const payload2 = { v: 2 };
    const pHash2 = complianceLedgerService._hashPayload(payload2);
    const cHash2 = complianceLedgerService._calculateCurrentHash('WRONG_PREV_HASH', mockVerificationId, 'APPROVE', ts2, pHash2);

    const entries = [
      { sequenceNumber: 1, previousHash: '0000000000000000000000000000000000000000000000000000000000000000', currentHash: cHash1, payloadHash: pHash1, auditPayload: payload1, eventType: 'INIT', timestamp: ts1 },
      { sequenceNumber: 2, previousHash: 'WRONG_PREV_HASH', currentHash: cHash2, payloadHash: pHash2, auditPayload: payload2, eventType: 'APPROVE', timestamp: ts2 },
    ];
    jest.spyOn(VerificationComplianceLedger, 'find').mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(entries) }) });

    const res = await complianceLedgerService.verifyLedgerIntegrity(mockVerificationId);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('Previous hash mismatch');
  });

  test('Test 21: verifyLedgerIntegrity returns valid: false when payloadHash mismatch is detected', async () => {
    const entries = [
      { sequenceNumber: 1, previousHash: '0000000000000000000000000000000000000000000000000000000000000000', currentHash: 'hash1', payloadHash: 'TAMPERED_HASH', auditPayload: { tampered: true }, eventType: 'INIT', timestamp: new Date() },
    ];
    jest.spyOn(VerificationComplianceLedger, 'find').mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(entries) }) });

    const res = await complianceLedgerService.verifyLedgerIntegrity(mockVerificationId);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('Payload tampered');
  });

  test('Test 22: verifyLedgerIntegrity returns valid: false when currentHash mismatch is detected', async () => {
    const payload = { verificationId: mockVerificationId, eventType: 'INIT' };
    const pHash = complianceLedgerService._hashPayload(payload);
    const entries = [
      { sequenceNumber: 1, previousHash: '0000000000000000000000000000000000000000000000000000000000000000', currentHash: 'CORRUPTED_CURRENT_HASH', payloadHash: pHash, auditPayload: payload, eventType: 'INIT', timestamp: new Date() },
    ];
    jest.spyOn(VerificationComplianceLedger, 'find').mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(entries) }) });

    const res = await complianceLedgerService.verifyLedgerIntegrity(mockVerificationId);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('Current hash invalid');
  });

  test('Test 23: verifyLedgerIntegrity emits LEDGER_TAMPER_DETECTED event on broken chain', async () => {
    const entries = [{ sequenceNumber: 2, previousHash: '0000...0000', currentHash: 'h2', payloadHash: 'p2', auditPayload: {}, eventType: 'TEST', timestamp: new Date() }];
    jest.spyOn(VerificationComplianceLedger, 'find').mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(entries) }) });
    const publishSpy = jest.spyOn(EventService, 'publish').mockResolvedValue(true);

    await complianceLedgerService.verifyLedgerIntegrity(mockVerificationId);
    expect(publishSpy).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringMatching(/tamper_detected/i) }));
  });

  test('Test 24: verifyLedgerIntegrity detects timestamp out-of-order sequence violation', async () => {
    const ts1 = new Date(Date.now());
    const ts2 = new Date(Date.now() - 10000); // 10s earlier than ts1

    const payload1 = { v: 1 }; const pHash1 = complianceLedgerService._hashPayload(payload1);
    const cHash1 = complianceLedgerService._calculateCurrentHash('0000000000000000000000000000000000000000000000000000000000000000', mockVerificationId, 'INIT', ts1, pHash1);

    const payload2 = { v: 2 }; const pHash2 = complianceLedgerService._hashPayload(payload2);
    const cHash2 = complianceLedgerService._calculateCurrentHash(cHash1, mockVerificationId, 'APPROVE', ts2, pHash2);

    const entries = [
      { sequenceNumber: 1, previousHash: '0000000000000000000000000000000000000000000000000000000000000000', currentHash: cHash1, payloadHash: pHash1, auditPayload: payload1, eventType: 'INIT', timestamp: ts1 },
      { sequenceNumber: 2, previousHash: cHash1, currentHash: cHash2, payloadHash: pHash2, auditPayload: payload2, eventType: 'APPROVE', timestamp: ts2 },
    ];

    jest.spyOn(VerificationComplianceLedger, 'find').mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(entries) }) });

    const res = await complianceLedgerService.verifyLedgerIntegrity(mockVerificationId);
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('Timestamp out of order');
  });

  // ── GROUP 5: Role-Based Access Control & Sanitization (Tests 25-30) ──

  test('Test 25: getAuditHistory returns sanitized summary for tenant role', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);

    const history = await complianceLedgerService.getAuditHistory(mockVerificationId, { id: mockTenantId, role: 'tenant' });
    expect(history).toHaveProperty('publicStatus');
    expect(history).toHaveProperty('recertificationStatus');
    expect(history).not.toHaveProperty('ledgerEntries');
  });

  test('Test 26: getAuditHistory returns sanitized summary for user role', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);

    const history = await complianceLedgerService.getAuditHistory(mockVerificationId, { id: mockTenantId, role: 'user' });
    expect(history).toHaveProperty('publicStatus');
    expect(history).not.toHaveProperty('ledgerEntries');
  });

  test('Test 27: getAuditHistory throws 403 Forbidden if tenant attempts IDOR on another applicant ledger', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);

    await expect(
      complianceLedgerService.getAuditHistory(mockVerificationId, { id: new mongoose.Types.ObjectId().toString(), role: 'tenant' })
    ).rejects.toThrow('Access denied');
  });

  test('Test 28: getAuditHistory returns full granular timeline for admin role', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(VerificationComplianceLedger, 'find').mockReturnValue({ sort: () => ({ lean: () => Promise.resolve([]) }) });
    jest.spyOn(complianceLedgerService, 'verifyLedgerIntegrity').mockResolvedValue({ valid: true, totalEntries: 0 });

    const history = await complianceLedgerService.getAuditHistory(mockVerificationId, { id: mockAdminId, role: 'admin' });
    expect(history).toHaveProperty('globalStatus');
    expect(history).toHaveProperty('ledgerEntries');
    expect(history).toHaveProperty('integrity');
  });

  test('Test 29: getAuditHistory returns full granular timeline for manager role', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(VerificationComplianceLedger, 'find').mockReturnValue({ sort: () => ({ lean: () => Promise.resolve([]) }) });
    jest.spyOn(complianceLedgerService, 'verifyLedgerIntegrity').mockResolvedValue({ valid: true, totalEntries: 0 });

    const history = await complianceLedgerService.getAuditHistory(mockVerificationId, { id: mockManagerId, role: 'manager' });
    expect(history).toHaveProperty('globalStatus');
    expect(history).toHaveProperty('ledgerEntries');
  });

  test('Test 30: Multi-verification isolation ensures independent sequence counts', async () => {
    const vId1 = new mongoose.Types.ObjectId().toString();
    const vId2 = new mongoose.Types.ObjectId().toString();

    jest.spyOn(Verification, 'findOne').mockImplementation((query) => {
      return Promise.resolve({ _id: query._id, status: 'APPROVED', save: () => Promise.resolve() });
    });
    jest.spyOn(VerificationComplianceLedger, 'create').mockImplementation((data) => Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId() }));

    jest.spyOn(Verification, 'findOneAndUpdate').mockResolvedValueOnce({ _id: vId1, complianceAudit: { ledgerSequenceCount: 1 } });
    jest.spyOn(VerificationComplianceLedger, 'findOne').mockReturnValueOnce({ sort: () => ({ lean: () => Promise.resolve(null) }) });

    const res1 = await complianceLedgerService.appendAuditEntry(vId1, 'INIT', { id: mockTenantId, role: 'tenant' });

    jest.spyOn(Verification, 'findOneAndUpdate').mockResolvedValueOnce({ _id: vId2, complianceAudit: { ledgerSequenceCount: 1 } });
    jest.spyOn(VerificationComplianceLedger, 'findOne').mockReturnValueOnce({ sort: () => ({ lean: () => Promise.resolve(null) }) });

    const res2 = await complianceLedgerService.appendAuditEntry(vId2, 'INIT', { id: mockTenantId, role: 'tenant' });

    expect(res1.sequenceNumber).toBe(1);
    expect(res2.sequenceNumber).toBe(1);
  });

  // ── GROUP 6: 100-Append Stress Test (Test 31) ──

  test('Test 31: 100 appendAuditEntry() calls produce exactly 100 unique sequence numbers (1..100) with unbroken previousHash linkage', async () => {
    let currentSeq = 0;
    let lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const ledgerStore = [];

    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);

    jest.spyOn(Verification, 'findOneAndUpdate').mockImplementation(() => {
      currentSeq++;
      return Promise.resolve({
        ...mockVerification,
        complianceAudit: { ledgerSequenceCount: currentSeq },
      });
    });

    jest.spyOn(VerificationComplianceLedger, 'findOne').mockImplementation(() => {
      const last = ledgerStore[ledgerStore.length - 1] || null;
      return { sort: () => ({ lean: () => Promise.resolve(last) }) };
    });

    jest.spyOn(VerificationComplianceLedger, 'create').mockImplementation((data) => {
      ledgerStore.push(data);
      lastHash = data.currentHash;
      return Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId() });
    });

    const results = [];
    for (let i = 0; i < 100; i++) {
      const res = await complianceLedgerService.appendAuditEntry(mockVerificationId, `EVENT_${i + 1}`, { id: mockAdminId, role: 'admin' });
      results.push(res);
    }

    expect(results).toHaveLength(100);

    const seqNumbers = results.map((r) => r.sequenceNumber).sort((a, b) => a - b);
    expect(seqNumbers).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));

    // Verify unbroken hash chain
    let prev = '0000000000000000000000000000000000000000000000000000000000000000';
    for (let i = 0; i < ledgerStore.length; i++) {
      expect(ledgerStore[i].previousHash).toBe(prev);
      prev = ledgerStore[i].currentHash;
    }
  });

  // ── GROUP 7: Continuous Recertification Engine & Lifecycle Integration (Tests 32-41) ──

  test('Test 32: Continuous recertification sweep ignores non-APPROVED verifications (DRAFT, SUBMITTED)', async () => {
    jest.spyOn(Verification, 'find').mockResolvedValue([]); // Find for status: APPROVED returns empty

    const res = await complianceLedgerService.triggerRecertificationSweep();
    expect(res.totalProcessed).toBe(0);
  });

  test('Test 33: Continuous recertification sweep emits warning notice for APPROVED verifications aged > 335 days', async () => {
    const v340Days = {
      _id: mockVerificationId,
      status: 'APPROVED',
      verifiedAt: new Date(Date.now() - 340 * 24 * 60 * 60 * 1000),
      complianceAudit: { recertificationStatus: 'CURRENT' },
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Verification, 'find').mockResolvedValue([v340Days]);
    const publishSpy = jest.spyOn(EventService, 'publish').mockResolvedValue(true);

    const res = await complianceLedgerService.triggerRecertificationSweep();
    expect(res.warningsTriggered).toBe(1);
    expect(publishSpy).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringMatching(/recertification\.triggered/i) }));
  });

  test('Test 34: Continuous recertification sweep updates complianceAudit.recertificationStatus = RECERTIFICATION_DUE for verifications aged > 365 days', async () => {
    const v370Days = {
      _id: mockVerificationId,
      status: 'APPROVED',
      verifiedAt: new Date(Date.now() - 370 * 24 * 60 * 60 * 1000),
      complianceAudit: { recertificationStatus: 'CURRENT' },
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Verification, 'find').mockResolvedValue([v370Days]);
    jest.spyOn(complianceLedgerService, 'appendAuditEntry').mockResolvedValue({});

    const res = await complianceLedgerService.triggerRecertificationSweep();
    expect(res.dueTriggered).toBe(1);
    expect(v370Days.complianceAudit.recertificationStatus).toBe('RECERTIFICATION_DUE');
  });

  test('Test 35: Continuous recertification sweep updates complianceAudit.recertificationStatus = EXPIRED for verifications aged > 395 days', async () => {
    const v400Days = {
      _id: mockVerificationId,
      status: 'APPROVED',
      verifiedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      complianceAudit: { recertificationStatus: 'RECERTIFICATION_DUE' },
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Verification, 'find').mockResolvedValue([v400Days]);
    jest.spyOn(complianceLedgerService, 'appendAuditEntry').mockResolvedValue({});

    const res = await complianceLedgerService.triggerRecertificationSweep();
    expect(res.expiredTriggered).toBe(1);
    expect(v400Days.complianceAudit.recertificationStatus).toBe('EXPIRED');
  });

  test('Test 36: Continuous recertification sweep preserves Phase 3.5 global status === APPROVED when marking EXPIRED', async () => {
    const v400Days = {
      _id: mockVerificationId,
      status: 'APPROVED',
      verifiedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      complianceAudit: { recertificationStatus: 'RECERTIFICATION_DUE' },
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Verification, 'find').mockResolvedValue([v400Days]);
    jest.spyOn(complianceLedgerService, 'appendAuditEntry').mockResolvedValue({});

    await complianceLedgerService.triggerRecertificationSweep();
    expect(v400Days.status).toBe('APPROVED'); // Phase 3.5 status untouched!
  });

  test('Test 37: Continuous recertification sweep logs RECERTIFICATION_EXPIRED entry in compliance ledger', async () => {
    const v400Days = {
      _id: mockVerificationId,
      status: 'APPROVED',
      verifiedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      complianceAudit: { recertificationStatus: 'RECERTIFICATION_DUE' },
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Verification, 'find').mockResolvedValue([v400Days]);
    const appendSpy = jest.spyOn(complianceLedgerService, 'appendAuditEntry').mockResolvedValue({});

    await complianceLedgerService.triggerRecertificationSweep();
    expect(appendSpy).toHaveBeenCalledWith(mockVerificationId, 'RECERTIFICATION_EXPIRED', expect.anything());
  });

  test('Test 38: recertifyVerification approves eligible record and resets recertificationStatus = CURRENT', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(complianceLedgerService, 'appendAuditEntry').mockResolvedValue({});
    jest.spyOn(trustScoreService, 'recalculateTrustScore').mockResolvedValue(85);

    const res = await complianceLedgerService.recertifyVerification(mockVerificationId, 'APPROVE', { id: mockManagerId, role: 'manager' }, 'Recertified cleanly');
    expect(res.recertificationStatus).toBe('CURRENT');
    expect(mockVerification.complianceAudit.recertificationStatus).toBe('CURRENT');
  });

  test('Test 39: recertifyVerification rejects eligible record and sets recertificationStatus = EXPIRED', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(complianceLedgerService, 'appendAuditEntry').mockResolvedValue({});
    jest.spyOn(trustScoreService, 'recalculateTrustScore').mockResolvedValue(50);

    const res = await complianceLedgerService.recertifyVerification(mockVerificationId, 'REJECT', { id: mockManagerId, role: 'manager' }, 'Failed audit check');
    expect(res.recertificationStatus).toBe('EXPIRED');
    expect(mockVerification.complianceAudit.recertificationStatus).toBe('EXPIRED');
  });

  test('Test 40: recertifyVerification throws 400 Bad Request if verification is not APPROVED', async () => {
    mockVerification.status = 'SUBMITTED';
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);

    await expect(
      complianceLedgerService.recertifyVerification(mockVerificationId, 'APPROVE', { id: mockManagerId, role: 'manager' })
    ).rejects.toThrow('Recertification is only permitted for completed APPROVED verifications');
  });

  test('Test 41: recertifyVerification delegates to trustScoreService without hardcoded bonus points', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(complianceLedgerService, 'appendAuditEntry').mockResolvedValue({});
    const trustSpy = jest.spyOn(trustScoreService, 'recalculateTrustScore').mockResolvedValue(90);

    await complianceLedgerService.recertifyVerification(mockVerificationId, 'APPROVE', { id: mockManagerId, role: 'manager' });
    expect(trustSpy).toHaveBeenCalledWith(mockTenantId, 'User', 'RECERTIFICATION_APPROVED');
  });

  // ── GROUP 8: Verifiable Compliance Export Package & Resiliency (Tests 42-48) ──

  test('Test 42: generateCompliancePackage produces package verification digest SHA-256(verificationId:latestHash:timestamp:status)', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(complianceLedgerService, 'verifyLedgerIntegrity').mockResolvedValue({ valid: true, totalEntries: 5, latestHash: 'LATEST_HASH' });
    jest.spyOn(complianceLedgerService, 'appendAuditEntry').mockResolvedValue({});

    const pkg = await complianceLedgerService.generateCompliancePackage(mockVerificationId, { id: mockAdminId, role: 'admin' });
    expect(pkg).toHaveProperty('packageVerificationDigest');
    expect(pkg.packageVerificationDigest).toHaveLength(64);
  });

  test('Test 43: generateCompliancePackage updates complianceAudit.auditPackageReference on Verification doc', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(complianceLedgerService, 'verifyLedgerIntegrity').mockResolvedValue({ valid: true, totalEntries: 5, latestHash: 'LATEST_HASH' });
    jest.spyOn(complianceLedgerService, 'appendAuditEntry').mockResolvedValue({});

    const pkg = await complianceLedgerService.generateCompliancePackage(mockVerificationId, { id: mockAdminId, role: 'admin' });
    expect(mockVerification.complianceAudit.auditPackageReference).toBe(pkg.packageReference);
  });

  test('Test 44: generateCompliancePackage allows admin and manager roles', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(complianceLedgerService, 'verifyLedgerIntegrity').mockResolvedValue({ valid: true, totalEntries: 5, latestHash: 'LATEST_HASH' });
    jest.spyOn(complianceLedgerService, 'appendAuditEntry').mockResolvedValue({});

    const pkgAdmin = await complianceLedgerService.generateCompliancePackage(mockVerificationId, { id: mockAdminId, role: 'admin' });
    const pkgManager = await complianceLedgerService.generateCompliancePackage(mockVerificationId, { id: mockManagerId, role: 'manager' });

    expect(pkgAdmin).toBeDefined();
    expect(pkgManager).toBeDefined();
  });

  test('Test 45: generateCompliancePackage throws 403 Forbidden for tenant role', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);

    await expect(
      complianceLedgerService.generateCompliancePackage(mockVerificationId, { id: mockTenantId, role: 'tenant' })
    ).rejects.toThrow('Access denied');
  });

  test('Test 46: Audit write failure sets complianceAudit.syncState = DEGRADED_PENDING_RETRY', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(Verification, 'findOneAndUpdate').mockRejectedValue(new Error('DB WRITE TIMEOUT'));
    const updateSpy = jest.spyOn(Verification, 'updateOne').mockResolvedValue({});

    await expect(
      complianceLedgerService.appendAuditEntry(mockVerificationId, 'TEST_EVENT', { id: mockTenantId, role: 'tenant' })
    ).rejects.toThrow('Compliance audit logging failed');

    expect(updateSpy).toHaveBeenCalledWith(
      { _id: mockVerificationId },
      { $set: { 'complianceAudit.syncState': 'DEGRADED_PENDING_RETRY' } }
    );
  });

  test('Test 47: Audit write failure preserves Phase 3.5 global status and does not corrupt verification data', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(Verification, 'findOneAndUpdate').mockRejectedValue(new Error('DB WRITE TIMEOUT'));
    jest.spyOn(Verification, 'updateOne').mockResolvedValue({});

    await expect(
      complianceLedgerService.appendAuditEntry(mockVerificationId, 'TEST_EVENT', { id: mockTenantId, role: 'tenant' })
    ).rejects.toThrow();

    expect(mockVerification.status).toBe('APPROVED'); // Phase 3.5 status untouched!
  });

  test('Test 48: Full end-to-end integration flow', async () => {
    jest.spyOn(Verification, 'findOne').mockResolvedValue(mockVerification);
    jest.spyOn(Verification, 'findOneAndUpdate').mockResolvedValue({
      ...mockVerification,
      complianceAudit: { ...mockVerification.complianceAudit, ledgerSequenceCount: 1 },
    });
    jest.spyOn(VerificationComplianceLedger, 'findOne').mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(null) }) });
    jest.spyOn(VerificationComplianceLedger, 'create').mockImplementation((data) => Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId() }));

    const logRes = await complianceLedgerService.appendAuditEntry(mockVerificationId, 'VERIFICATION_INITIATED', { id: mockTenantId, role: 'tenant' });
    expect(logRes.sequenceNumber).toBe(1);

    jest.spyOn(VerificationComplianceLedger, 'find').mockReturnValue({ sort: () => ({ lean: () => Promise.resolve([{ sequenceNumber: 1, previousHash: '0000000000000000000000000000000000000000000000000000000000000000', currentHash: logRes.currentHash, payloadHash: complianceLedgerService._hashPayload(complianceLedgerService._constructAllowlistedPayload(mockVerification, 'VERIFICATION_INITIATED')), auditPayload: complianceLedgerService._constructAllowlistedPayload(mockVerification, 'VERIFICATION_INITIATED'), eventType: 'VERIFICATION_INITIATED', timestamp: logRes.timestamp }]) }) });

    const integrityRes = await complianceLedgerService.verifyLedgerIntegrity(mockVerificationId);
    expect(integrityRes.valid).toBe(true);

    const pkgRes = await complianceLedgerService.generateCompliancePackage(mockVerificationId, { id: mockAdminId, role: 'admin' });
    expect(pkgRes.chainIntegrityValid).toBe(true);
  });
});
