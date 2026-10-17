import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  TransactionOutcome,
  runTransactionWithRetry,
  isTransientError,
  isDuplicateKeyError,
  isUnknownCommitResult,
} from '../../src/utils/transactionRunner.js';
import {
  generateApprovalSignature,
  verifyApprovalSignature,
  proposeOfflineRecovery,
  approveOfflineRecovery,
  executeOfflineRecoverySettlementAtomic,
} from '../../src/services/offlineSettlementService.js';
import {
  deriveDeterministicReceiptId,
  deriveCheckoutSessionId,
  claimCheckoutAttempt,
  bindGatewayOrderToCheckoutAtomic,
} from '../../src/services/checkoutBindingService.js';
import {
  commitInvoicePublicationAtomic,
  reconcileQuarantinedInvoice,
} from '../../src/services/invoicePublicationService.js';
import Payment from '../../src/models/Payment.js';
import PaymentTransaction from '../../src/models/PaymentTransaction.js';
import OfflineRecoveryApproval from '../../src/models/OfflineRecoveryApproval.js';
import CheckoutSession from '../../src/models/CheckoutSession.js';
import FileMetadata from '../../src/models/FileMetadata.js';
import PlatformSetting from '../../src/models/PlatformSetting.js';
import RefundIntent from '../../src/models/RefundIntent.js';
import Bill from '../../src/models/Bill.js';
import Lease from '../../src/models/Lease.js';
import Tenant from '../../src/models/Tenant.js';
import User from '../../src/models/User.js';
import Property from '../../src/models/Property.js';
import { initiateDurableRefund, isUncertainGatewayError } from '../../src/services/refundService.js';
import { superAdminOnly } from '../../src/middleware/auth.js';
import { verifyRazorpayRentPayment, processPaymentRefund } from '../../src/controllers/paymentController.js';
import { register, updateProfile } from '../../src/controllers/authController.js';
import { createUser, updateUser, assignRole } from '../../src/controllers/userController.js';

function mockMongooseQuery(val) {
  const query = {
    session: jest.fn().mockImplementation(() => Promise.resolve(val)),
    sort: jest.fn().mockImplementation(() => query),
    select: jest.fn().mockImplementation(() => query),
    populate: jest.fn().mockImplementation(() => query),
    then: (resolve, reject) => Promise.resolve(val).then(resolve, reject),
  };
  return query;
}

describe('TMS Phase A — Critical Reliability & Financial Consistency Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(PlatformSetting, 'findOne').mockReturnValue(
      mockMongooseQuery({
        platformFeeEnabled: true,
        platformFeeType: 'percentage',
        platformFeePercentage: 1.0,
        platformFeeFixedAmount: 0,
        platformFeePayer: 'tenant',
        platformFeeTaxPercentage: 0,
        managerCommissionEnabled: false,
        managerCommissionPercentage: 0,
      })
    );
    jest.spyOn(Property, 'findById').mockReturnValue(
      mockMongooseQuery({
        _id: new mongoose.Types.ObjectId(),
        name: 'Default Property',
        manager: new mongoose.Types.ObjectId(),
        owner: new mongoose.Types.ObjectId(),
      })
    );
    jest.spyOn(Property, 'findOne').mockReturnValue(
      mockMongooseQuery({
        _id: new mongoose.Types.ObjectId(),
        name: 'Default Property',
        manager: new mongoose.Types.ObjectId(),
        owner: new mongoose.Types.ObjectId(),
      })
    );
    jest.spyOn(Tenant, 'findById').mockReturnValue(
      mockMongooseQuery({
        _id: new mongoose.Types.ObjectId(),
        email: 'tenant@default.com',
      })
    );
  });

  // =========================================================================
  // 1. Transaction Runner: Explicit 5-Outcome Contract
  // =========================================================================
  describe('1. Transaction Runner 5-Outcome Contract', () => {
    it('1.1 should return COMMITTED on clean successful execution', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockResolvedValue(true),
        abortTransaction: jest.fn().mockResolvedValue(true),
        endSession: jest.fn().mockResolvedValue(true),
        inTransaction: jest.fn().mockReturnValue(true),
      };
      const mockClient = {
        startSession: jest.fn().mockResolvedValue(mockSession),
      };

      const result = await runTransactionWithRetry(
        async (session) => {
          return { testKey: 'testVal' };
        },
        { clientOrMongoose: mockClient, operationName: 'TestCommitted' }
      );

      expect(result.outcome).toBe(TransactionOutcome.COMMITTED);
      expect(result.result).toEqual({ testKey: 'testVal' });
      expect(mockSession.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockSession.endSession).toHaveBeenCalledTimes(1);
    });

    it('1.2 should return CONFIRMED_ABORTED on non-transient application error', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn().mockResolvedValue(true),
        endSession: jest.fn().mockResolvedValue(true),
        inTransaction: jest.fn().mockReturnValue(true),
      };
      const mockClient = {
        startSession: jest.fn().mockResolvedValue(mockSession),
      };

      const result = await runTransactionWithRetry(
        async () => {
          throw new Error('Business logic validation failure');
        },
        { clientOrMongoose: mockClient, operationName: 'TestAbort' }
      );

      expect(result.outcome).toBe(TransactionOutcome.CONFIRMED_ABORTED);
      expect(result.error.message).toBe('Business logic validation failure');
      expect(mockSession.abortTransaction).toHaveBeenCalledTimes(1);
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    });

    it('1.3 should return DUPLICATE_KEY_CONFLICT on E11000 duplicate key error without unsafe retry', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn().mockResolvedValue(true),
        endSession: jest.fn().mockResolvedValue(true),
        inTransaction: jest.fn().mockReturnValue(true),
      };
      const mockClient = {
        startSession: jest.fn().mockResolvedValue(mockSession),
      };

      const dupError = new Error('E11000 duplicate key error collection: payments index: razorpayPaymentId');
      dupError.code = 11000;

      const result = await runTransactionWithRetry(
        async () => {
          throw dupError;
        },
        { clientOrMongoose: mockClient, operationName: 'TestDup' }
      );

      expect(result.outcome).toBe(TransactionOutcome.DUPLICATE_KEY_CONFLICT);
      expect(result.error.code).toBe(11000);
      expect(mockSession.abortTransaction).toHaveBeenCalledTimes(1);
    });

    it('1.4 should retry body on TransientTransactionError and return COMMITTED if subsequent attempt succeeds', async () => {
      let attempts = 0;
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockResolvedValue(true),
        abortTransaction: jest.fn().mockResolvedValue(true),
        endSession: jest.fn().mockResolvedValue(true),
        inTransaction: jest.fn().mockReturnValue(true),
      };
      const mockClient = {
        startSession: jest.fn().mockResolvedValue(mockSession),
      };

      const transientErr = new Error('WriteConflict error');
      transientErr.code = 112; // Code 112 WriteConflict

      const result = await runTransactionWithRetry(
        async () => {
          attempts++;
          if (attempts === 1) {
            throw transientErr;
          }
          return { recovered: true };
        },
        { clientOrMongoose: mockClient, maxBodyRetries: 3, operationName: 'TestTransient' }
      );

      expect(attempts).toBe(2);
      expect(result.outcome).toBe(TransactionOutcome.COMMITTED);
      expect(result.result).toEqual({ recovered: true });
    });

    it('1.5 should retry commit on same session for UnknownTransactionCommitResult and return INDETERMINATE_COMMIT if retries exhausted', async () => {
      const unknownCommitErr = new Error('UnknownTransactionCommitResult');
      unknownCommitErr.hasErrorLabel = (label) => label === 'UnknownTransactionCommitResult';

      let commitCalls = 0;
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockImplementation(() => {
          commitCalls++;
          throw unknownCommitErr;
        }),
        abortTransaction: jest.fn().mockResolvedValue(true),
        endSession: jest.fn().mockResolvedValue(true),
        inTransaction: jest.fn().mockReturnValue(true),
      };
      const mockClient = {
        startSession: jest.fn().mockResolvedValue(mockSession),
      };

      const result = await runTransactionWithRetry(
        async () => {
          return { payload: 123 };
        },
        {
          clientOrMongoose: mockClient,
          maxCommitRetries: 3,
          operationName: 'TestIndeterminate',
        }
      );

      expect(commitCalls).toBe(3);
      expect(result.outcome).toBe(TransactionOutcome.INDETERMINATE_COMMIT);
      // Critical check: NEVER abort transaction on UnknownTransactionCommitResult!
      expect(mockSession.abortTransaction).not.toHaveBeenCalled();
    });

    it('1.6 should resolve INDETERMINATE_COMMIT to COMMITTED if majority reconciliation confirms commit', async () => {
      const unknownCommitErr = new Error('UnknownTransactionCommitResult');
      unknownCommitErr.hasErrorLabel = (label) => label === 'UnknownTransactionCommitResult';

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockRejectedValue(unknownCommitErr),
        abortTransaction: jest.fn().mockResolvedValue(true),
        endSession: jest.fn().mockResolvedValue(true),
        inTransaction: jest.fn().mockReturnValue(true),
      };
      const mockClient = {
        startSession: jest.fn().mockResolvedValue(mockSession),
      };

      const reconciliationFn = jest.fn().mockResolvedValue({
        confirmedCommitted: true,
        result: { confirmedByMajority: true },
      });

      const result = await runTransactionWithRetry(
        async () => ({ payload: 'body' }),
        {
          clientOrMongoose: mockClient,
          maxCommitRetries: 2,
          reconciliationFn,
          operationName: 'TestReconcileCommit',
        }
      );

      expect(result.outcome).toBe(TransactionOutcome.COMMITTED);
      expect(result.result).toEqual({ confirmedByMajority: true });
      expect(reconciliationFn).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. Offline Settlement: Cryptographic Four-Eyes Authorization & Financial Accounting
  // =========================================================================
  describe('2. Offline Settlement Financial Consistency & Four-Eyes Authorization', () => {
    const mockPaymentId = new mongoose.Types.ObjectId();
    const mockTenantId = new mongoose.Types.ObjectId();
    const mockManagerId = new mongoose.Types.ObjectId();
    const mockAdminId = new mongoose.Types.ObjectId();

    it('2.1 should validate proposed amount against exact outstanding balance in integer paise', async () => {
      // Payment has gross totalAmount 15150, amountPaid 5150 => unpaid balance 10000 => 1000000 paise
      const fakePayment = {
        _id: mockPaymentId,
        tenant: mockTenantId,
        property: new mongoose.Types.ObjectId(),
        amount: 15000,
        totalAmount: 15150,
        amountPaid: 5150,
        currency: 'INR',
        status: 'partially_paid',
      };

      jest.spyOn(Payment, 'findById').mockResolvedValue(fakePayment);
      jest.spyOn(OfflineRecoveryApproval, 'findOne').mockResolvedValue(null);
      const createSpy = jest.spyOn(OfflineRecoveryApproval, 'create').mockImplementation((data) => ({
        ...data,
        _id: new mongoose.Types.ObjectId(),
      }));

      // Case A: Mismatched amount in paise (1 paise discrepancy)
      await expect(
        proposeOfflineRecovery({
          paymentId: mockPaymentId,
          proposedByUser: { _id: mockManagerId, role: 'manager' },
          expectedPaise: 1000001, // 1 paise too high!
          currency: 'INR',
          proposalReason: 'Bank transfer UTR mismatch test',
          evidenceIdentifier: 'UTR12345678',
        })
      ).rejects.toThrow(/does not match exact unpaid balance/);

      // Case B: Exact integer paise match (10,000 * 100 = 1,000,000 paise)
      const proposal = await proposeOfflineRecovery({
        paymentId: mockPaymentId,
        proposedByUser: { _id: mockManagerId, role: 'manager' },
        expectedPaise: 1000000,
        currency: 'INR',
        proposalReason: 'Bank transfer UTR verified',
        evidenceIdentifier: 'UTR12345678',
      });

      expect(proposal.expectedPaise).toBe(1000000);
      expect(proposal.status).toBe('PENDING_SUPER_ADMIN_APPROVAL');
      expect(createSpy).toHaveBeenCalled();
    });

    it('2.2 should reject self-approval under Four-Eyes Super Admin policy', async () => {
      const mockApprovalId = new mongoose.Types.ObjectId();
      const fakeApproval = {
        _id: mockApprovalId,
        payment: mockPaymentId,
        expectedPaise: 1000000,
        proposedBy: mockManagerId,
        status: 'PENDING_SUPER_ADMIN_APPROVAL',
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(OfflineRecoveryApproval, 'findById').mockResolvedValue(fakeApproval);

      // Attempting to self-approve with same user ID
      await expect(
        approveOfflineRecovery({
          approvalId: mockApprovalId,
          superAdminUser: { _id: mockManagerId, role: 'super_admin' },
        })
      ).rejects.toThrow(/Four-Eyes policy violation: You cannot approve a proposal you created/);
    });

    it('2.3 should successfully approve proposal with cryptographic signature when approved by distinct Super Admin', async () => {
      const mockApprovalId = new mongoose.Types.ObjectId();
      const fakeApproval = {
        _id: mockApprovalId,
        payment: mockPaymentId,
        expectedPaise: 1000000,
        proposedBy: mockManagerId,
        status: 'PENDING_SUPER_ADMIN_APPROVAL',
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(OfflineRecoveryApproval, 'findById').mockResolvedValue(fakeApproval);

      const approved = await approveOfflineRecovery({
        approvalId: mockApprovalId,
        superAdminUser: { _id: mockAdminId, role: 'super_admin' },
      });

      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedBy).toBe(mockAdminId);
      expect(approved.approvalSignature).toBeDefined();

      // Verify the generated cryptographic signature
      const valid = verifyApprovalSignature(
        mockApprovalId.toString(),
        mockPaymentId.toString(),
        1000000,
        mockAdminId.toString(),
        approved.approvalSignature
      );
      expect(valid).toBe(true);
    });

    it('2.3b should strictly reject generic admin from Four-Eyes offline approvals with HTTP 403', async () => {
      const mockApprovalId = new mongoose.Types.ObjectId();
      const fakeApproval = {
        _id: mockApprovalId,
        payment: mockPaymentId,
        expectedPaise: 1000000,
        proposedBy: mockManagerId,
        status: 'PENDING_SUPER_ADMIN_APPROVAL',
      };

      jest.spyOn(OfflineRecoveryApproval, 'findById').mockResolvedValue(fakeApproval);

      await expect(
        approveOfflineRecovery({
          approvalId: mockApprovalId,
          superAdminUser: { _id: mockAdminId, role: 'admin', isSuperAdmin: false },
        })
      ).rejects.toThrow(/Forbidden: Only Super Administrators can approve offline settlements/);
    });

    it('2.4 should atomically execute settlement: consume approval, update cumulative paid, append receipt, and sync ledger', async () => {
      const mockApprovalId = new mongoose.Types.ObjectId();
      const validSignature = generateApprovalSignature(
        mockApprovalId.toString(),
        mockPaymentId.toString(),
        1000000,
        mockAdminId.toString()
      );

      const fakeApproval = {
        _id: mockApprovalId,
        payment: mockPaymentId,
        expectedPaise: 1000000, // ₹10,000
        approvedBy: mockAdminId,
        approvalSignature: validSignature,
        status: 'APPROVED',
        evidenceIdentifier: 'UTR_OFFLINE_9999',
        approvedAt: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };

      const fakePayment = {
        _id: mockPaymentId,
        tenant: mockTenantId,
        owner: mockManagerId,
        amount: 15000,
        totalAmount: 15150,
        amountPaid: 5150,
        status: 'partially_paid',
        receipts: [{ amount: 5150, reference: 'INITIAL_PAY' }],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(OfflineRecoveryApproval, 'findById').mockReturnValue(mockMongooseQuery(fakeApproval));
      jest.spyOn(OfflineRecoveryApproval, 'findOneAndUpdate').mockResolvedValue({
        ...fakeApproval,
        status: 'CONSUMED',
        save: jest.fn().mockResolvedValue(true),
      });

      jest.spyOn(Payment, 'findById').mockReturnValue(mockMongooseQuery(fakePayment));
      jest.spyOn(PaymentTransaction, 'findOne').mockReturnValue(mockMongooseQuery(null));

      const mockCreatedTxn = {
        _id: new mongoose.Types.ObjectId(),
        totalAmount: 15150,
        managerNetAmount: 15000,
        platformFee: 150,
      };
      jest.spyOn(PaymentTransaction, 'create').mockResolvedValue([mockCreatedTxn]);

      // Mock session for transactionRunner
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockResolvedValue(true),
        abortTransaction: jest.fn().mockResolvedValue(true),
        endSession: jest.fn().mockResolvedValue(true),
        inTransaction: jest.fn().mockReturnValue(true),
      };
      const mockClient = {
        startSession: jest.fn().mockResolvedValue(mockSession),
      };

      const result = await executeOfflineRecoverySettlementAtomic({
        approvalId: mockApprovalId,
        executorUser: { _id: mockManagerId },
        mongooseInstance: mockClient,
      });

      expect(result.success).toBe(true);
      expect(result.outcome).toBe(TransactionOutcome.COMMITTED);

      // Cumulative balance invariant: 5150 + 10000 = 15150
      expect(fakePayment.amountPaid).toBe(15150);
      expect(fakePayment.status).toBe('paid');

      // Incremental receipt appended
      expect(fakePayment.receipts.length).toBe(2);
      expect(fakePayment.receipts[1].amount).toBe(10000);
      expect(fakePayment.receipts[1].reference).toBe('UTR_OFFLINE_9999');

      // Linked to PaymentTransaction
      expect(fakePayment.transaction).toBe(mockCreatedTxn._id);
    });

    it('2.5 should prevent duplicate consumption of approval and duplicate receipts', async () => {
      const mockApprovalId = new mongoose.Types.ObjectId();
      const fakeApprovalAlreadyConsumed = {
        _id: mockApprovalId,
        payment: mockPaymentId,
        expectedPaise: 1000000,
        status: 'CONSUMED',
      };

      jest.spyOn(OfflineRecoveryApproval, 'findById').mockResolvedValue(fakeApprovalAlreadyConsumed);

      await expect(
        executeOfflineRecoverySettlementAtomic({
          approvalId: mockApprovalId,
          executorUser: { _id: mockManagerId },
        })
      ).rejects.toThrow(/already been consumed and settled/);
    });
  });

  // =========================================================================
  // 3. Invoice Publication Recovery & Indefinite Quarantine
  // =========================================================================
  describe('3. Invoice Publication Recovery & Durable Quarantine', () => {
    const mockPaymentId = new mongoose.Types.ObjectId();
    const mockFileId = new mongoose.Types.ObjectId();

    it('3.1 should commit invoice publication and update Payment.fileId and FileMetadata publicationState', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockResolvedValue(true),
        abortTransaction: jest.fn().mockResolvedValue(true),
        endSession: jest.fn().mockResolvedValue(true),
        inTransaction: jest.fn().mockReturnValue(true),
      };
      const mockClient = {
        startSession: jest.fn().mockResolvedValue(mockSession),
      };

      jest.spyOn(FileMetadata, 'findOneAndUpdate').mockResolvedValue({
        _id: mockFileId,
        publicationState: 'COMMITTED',
      });

      jest.spyOn(Payment, 'findOneAndUpdate').mockResolvedValue({
        _id: mockPaymentId,
        fileId: mockFileId,
        invoiceUrl: `/api/files/download/${mockFileId}`,
        sideEffects: { invoice: { status: 'COMMITTED' } },
      });

      const result = await commitInvoicePublicationAtomic({
        paymentId: mockPaymentId,
        fileId: mockFileId,
        fileKey: 'invoices/invoice_123.pdf',
        leaseVersion: 1,
        mongooseInstance: mockClient,
      });

      expect(result.success).toBe(true);
      expect(result.outcome).toBe(TransactionOutcome.COMMITTED);
      expect(result.invoiceUrl).toBe(`/api/files/download/${mockFileId}`);
    });

    it('3.2 should transition to COMMIT_INDETERMINATE quarantine on uncertain commit outcome without deleting object', async () => {
      const unknownCommitErr = new Error('UnknownTransactionCommitResult');
      unknownCommitErr.hasErrorLabel = (label) => label === 'UnknownTransactionCommitResult';

      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockRejectedValue(unknownCommitErr),
        abortTransaction: jest.fn().mockResolvedValue(true),
        endSession: jest.fn().mockResolvedValue(true),
        inTransaction: jest.fn().mockReturnValue(true),
      };
      const mockClient = {
        startSession: jest.fn().mockResolvedValue(mockSession),
      };

      jest.spyOn(FileMetadata, 'findOneAndUpdate').mockResolvedValue({ _id: mockFileId });
      jest.spyOn(Payment, 'findOneAndUpdate').mockResolvedValue({ _id: mockPaymentId });
      jest.spyOn(FileMetadata, 'findById').mockReturnValue(mockMongooseQuery(null));
      jest.spyOn(Payment, 'findById').mockReturnValue(mockMongooseQuery(null));
      const payUpdateSpy = jest.spyOn(Payment, 'findByIdAndUpdate').mockResolvedValue(true);

      const result = await commitInvoicePublicationAtomic({
        paymentId: mockPaymentId,
        fileId: mockFileId,
        fileKey: 'invoices/invoice_123.pdf',
        leaseVersion: 1,
        mongooseInstance: mockClient,
      });

      expect(result.success).toBe(false);
      expect(result.outcome).toBe(TransactionOutcome.INDETERMINATE_COMMIT);
      expect(result.quarantined).toBe(true);

      // Verify Payment record was updated to COMMIT_INDETERMINATE
      expect(payUpdateSpy).toHaveBeenCalledWith(
        mockPaymentId,
        expect.objectContaining({
          $set: expect.objectContaining({
            'sideEffects.invoice.status': 'COMMIT_INDETERMINATE',
          }),
        })
      );
    });

    it('3.3 should verify 3-point reconciliation before releasing quarantine', async () => {
      const fakePaymentQuarantined = {
        _id: mockPaymentId,
        fileId: mockFileId,
        invoiceUrl: null,
        sideEffects: {
          invoice: {
            status: 'COMMIT_INDETERMINATE',
            fileId: mockFileId,
            key: 'invoices/invoice_123.pdf',
          },
        },
        save: jest.fn().mockResolvedValue(true),
      };

      const fakeFileMetaCommitted = {
        _id: mockFileId,
        key: 'invoices/invoice_123.pdf',
        publicationState: 'COMMITTED',
        url: 'http://storage/invoice.pdf',
      };

      jest.spyOn(Payment, 'findById').mockResolvedValue(fakePaymentQuarantined);
      jest.spyOn(FileMetadata, 'findById').mockResolvedValue(fakeFileMetaCommitted);

      // Point 3: Storage check function
      const mockStorageCheck = jest.fn().mockResolvedValue(true);

      const recon = await reconcileQuarantinedInvoice({
        paymentId: mockPaymentId,
        storageCheckFn: mockStorageCheck,
      });

      expect(recon.reconciled).toBe(true);
      expect(mockStorageCheck).toHaveBeenCalledWith('invoices/invoice_123.pdf');
      expect(fakePaymentQuarantined.sideEffects.invoice.status).toBe('COMMITTED');
      expect(fakePaymentQuarantined.invoiceUrl).toBe(`/api/files/download/${mockFileId}`);
    });

    it('3.4 should fail reconciliation and maintain quarantine if storage object is missing', async () => {
      const fakePaymentQuarantined = {
        _id: mockPaymentId,
        fileId: mockFileId,
        sideEffects: {
          invoice: {
            status: 'COMMIT_INDETERMINATE',
            fileId: mockFileId,
            key: 'invoices/invoice_missing.pdf',
          },
        },
        save: jest.fn(),
      };

      const fakeFileMetaCommitted = {
        _id: mockFileId,
        key: 'invoices/invoice_missing.pdf',
        publicationState: 'COMMITTED',
      };

      jest.spyOn(Payment, 'findById').mockResolvedValue(fakePaymentQuarantined);
      jest.spyOn(FileMetadata, 'findById').mockResolvedValue(fakeFileMetaCommitted);

      // Physical storage object missing!
      const mockStorageCheck = jest.fn().mockResolvedValue(false);

      const recon = await reconcileQuarantinedInvoice({
        paymentId: mockPaymentId,
        storageCheckFn: mockStorageCheck,
      });

      expect(recon.reconciled).toBe(false);
      expect(recon.reason).toMatch(/storage object missing/i);
      expect(fakePaymentQuarantined.sideEffects.invoice.status).toBe('COMMIT_INDETERMINATE');
    });
  });

  // =========================================================================
  // 4. Pre-Call Checkout Intent & Deterministic Receipt Derivation
  // =========================================================================
  describe('4. Checkout Concurrency & Deterministic Receipt Limits', () => {
    it('4.1 should format deterministic receipt ID strictly <= 40 chars', () => {
      const sampleTargetId = new mongoose.Types.ObjectId();
      const periodEpochSec = 1780000000;
      const attempt = 1;

      const receiptId = deriveDeterministicReceiptId(sampleTargetId, periodEpochSec, attempt);

      expect(receiptId.length).toBeLessThanOrEqual(40);
      expect(receiptId.length).toBe(38); // Exactly 38 chars: r_<24hex>_<8hex>_<2hex>
      expect(receiptId.startsWith('r_')).toBe(true);
    });

    it('4.2 should format deterministic CheckoutSession ID strictly <= 40 chars', () => {
      const sampleTargetId = new mongoose.Types.ObjectId();
      const periodEpochSec = 1780000000;

      const sessionId = deriveCheckoutSessionId(sampleTargetId, periodEpochSec);

      expect(sessionId.length).toBeLessThanOrEqual(40);
      expect(sessionId.length).toBe(37); // Exactly 37 chars: chk_<24hex>_<8hex>
      expect(sessionId.startsWith('chk_')).toBe(true);
    });

    it('4.3 should atomically claim attempt and allocate next attempt number', async () => {
      const sampleTargetId = new mongoose.Types.ObjectId();
      const sampleTenantId = new mongoose.Types.ObjectId();
      const periodEpochSec = 1780000000;
      const expectedPaise = 1515000;

      jest.spyOn(CheckoutSession, 'findOneAndUpdate')
        .mockResolvedValueOnce({ _id: 'chk_init' }) // Upsert call
        .mockResolvedValueOnce({
          _id: 'chk_claimed',
          currentAttempt: 1,
          dispatchState: 'CLAIMED',
          save: jest.fn().mockResolvedValue(true),
        }); // Claim call

      const claim = await claimCheckoutAttempt({
        targetId: sampleTargetId,
        targetType: 'lease',
        tenantId: sampleTenantId,
        expectedAmountPaise: expectedPaise,
        periodEpochSec,
        workerId: 'worker-1',
      });

      expect(claim.claimed).toBe(true);
      expect(claim.attempt).toBe(1);
      expect(claim.receiptId).toBeDefined();
      expect(claim.receiptId.length).toBeLessThanOrEqual(40);
    });

    it('4.4 should return already bound order if checkout session is already BOUND', async () => {
      const sampleTargetId = new mongoose.Types.ObjectId();
      const sampleTenantId = new mongoose.Types.ObjectId();
      const periodEpochSec = 1780000000;

      jest.spyOn(CheckoutSession, 'findOneAndUpdate')
        .mockResolvedValueOnce({ _id: 'chk_init' }) // Upsert call
        .mockResolvedValueOnce(null); // Claim failed because already BOUND

      jest.spyOn(CheckoutSession, 'findById').mockResolvedValue({
        _id: 'chk_bound',
        dispatchState: 'BOUND',
        activeOrderId: 'order_RZP123456',
        activeReceiptId: 'r_abc_123',
      });

      const claim = await claimCheckoutAttempt({
        targetId: sampleTargetId,
        targetType: 'lease',
        tenantId: sampleTenantId,
        expectedAmountPaise: 1515000,
        periodEpochSec,
        workerId: 'worker-2',
      });

      expect(claim.claimed).toBe(false);
      expect(claim.alreadyBound).toBe(true);
      expect(claim.activeOrderId).toBe('order_RZP123456');
    });

    it('4.5 should atomically bind gateway order to CheckoutSession and Payment within transaction', async () => {
      const mockSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockResolvedValue(true),
        abortTransaction: jest.fn().mockResolvedValue(true),
        endSession: jest.fn().mockResolvedValue(true),
        inTransaction: jest.fn().mockReturnValue(true),
      };
      const mockClient = {
        startSession: jest.fn().mockResolvedValue(mockSession),
      };

      jest.spyOn(CheckoutSession, 'findOneAndUpdate').mockResolvedValue({
        _id: 'chk_123',
        activeOrderId: 'order_RZP777',
        dispatchState: 'BOUND',
      });

      jest.spyOn(Payment, 'findOneAndUpdate').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        razorpayOrderId: 'order_RZP777',
      });

      const result = await bindGatewayOrderToCheckoutAtomic({
        sessionId: 'chk_123',
        attempt: 1,
        workerId: 'worker-1',
        razorpayOrderId: 'order_RZP777',
        receiptId: 'r_abc_1',
        paymentId: new mongoose.Types.ObjectId(),
        mongooseInstance: mockClient,
      });

      expect(result.bound).toBe(true);
      expect(result.outcome).toBe(TransactionOutcome.COMMITTED);
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. Durable Refund Lifecycle & Indeterminate Quarantine
  // =========================================================================
  describe('5. Durable Refund Lifecycle & Indeterminate Quarantine', () => {
    const mockPaymentId = new mongoose.Types.ObjectId();
    const mockUserId = new mongoose.Types.ObjectId();

    it('5.1 should persist RefundIntent in INTENT_PERSISTED before gateway dispatch', async () => {
      const fakePayment = {
        _id: mockPaymentId,
        status: 'paid',
        amountPaid: 10000,
        refundedAmount: 0,
        currency: 'INR',
        razorpayPaymentId: 'pay_test_123',
        save: jest.fn().mockResolvedValue(true),
      };

      const mockRefundIntent = {
        _id: new mongoose.Types.ObjectId(),
        status: 'INTENT_PERSISTED',
        dispatchedAt: null,
        dispatchAttempts: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Payment, 'findById').mockResolvedValue(fakePayment);
      jest.spyOn(RefundIntent, 'findOne').mockResolvedValue(null);
      const createSpy = jest.spyOn(RefundIntent, 'create').mockResolvedValue(mockRefundIntent);

      const mockRzpClient = {
        payments: {
          refund: jest.fn().mockResolvedValue({ id: 'rfnd_abc_999', status: 'processed' }),
        },
      };

      const result = await initiateDurableRefund({
        paymentId: mockPaymentId,
        refundAmount: 2000,
        reason: 'Tenant deposit adjustment',
        requestedByUser: { _id: mockUserId, role: 'admin' },
        razorpayClient: mockRzpClient,
      });

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(mockRzpClient.payments.refund).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.status).toBe('SETTLED');
    });

    it('5.2 should reject refund exceeding remaining refundable balance (cumulative bound check)', async () => {
      const fakePayment = {
        _id: mockPaymentId,
        status: 'paid',
        amountPaid: 10000,
        refundedAmount: 8500, // Only ₹1,500 remaining refundable
        razorpayPaymentId: 'pay_test_123',
      };

      jest.spyOn(Payment, 'findById').mockResolvedValue(fakePayment);

      await expect(
        initiateDurableRefund({
          paymentId: mockPaymentId,
          refundAmount: 2000, // Exceeds 1500
          reason: 'Excess refund test',
          requestedByUser: { _id: mockUserId, role: 'admin' },
        })
      ).rejects.toThrow(/exceeds remaining refundable balance/i);
    });

    it('5.3 should quarantine refund into REFUND_INDETERMINATE on gateway network timeout and strictly prohibit automatic redispatch', async () => {
      const fakePayment = {
        _id: mockPaymentId,
        status: 'paid',
        amountPaid: 10000,
        refundedAmount: 0,
        razorpayPaymentId: 'pay_test_123',
        save: jest.fn().mockResolvedValue(true),
      };

      const mockRefundIntent = {
        _id: new mongoose.Types.ObjectId(),
        status: 'INTENT_PERSISTED',
        dispatchAttempts: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Payment, 'findById').mockResolvedValue(fakePayment);
      jest.spyOn(RefundIntent, 'findOne').mockResolvedValue(null);
      jest.spyOn(RefundIntent, 'create').mockResolvedValue(mockRefundIntent);

      const timeoutError = new Error('Gateway socket hang up');
      timeoutError.code = 'ETIMEDOUT';

      const mockRzpClient = {
        payments: {
          refund: jest.fn().mockRejectedValue(timeoutError),
        },
      };

      const result = await initiateDurableRefund({
        paymentId: mockPaymentId,
        refundAmount: 1000,
        reason: 'Timeout test',
        requestedByUser: { _id: mockUserId, role: 'admin' },
        razorpayClient: mockRzpClient,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('REFUND_INDETERMINATE');
      expect(result.quarantined).toBe(true);
      expect(mockRefundIntent.status).toBe('REFUND_INDETERMINATE');
      expect(fakePayment.save).not.toHaveBeenCalled(); // Ledger never mutated on uncertain outcome
    });

    it('5.4 should reject replay of quarantined REFUND_INDETERMINATE intent without re-calling gateway', async () => {
      const fakePayment = {
        _id: mockPaymentId,
        status: 'paid',
        amountPaid: 10000,
        refundedAmount: 0,
        razorpayPaymentId: 'pay_test_123',
      };

      const existingQuarantinedIntent = {
        _id: new mongoose.Types.ObjectId(),
        status: 'REFUND_INDETERMINATE',
      };

      jest.spyOn(Payment, 'findById').mockResolvedValue(fakePayment);
      jest.spyOn(RefundIntent, 'findOne').mockResolvedValue(existingQuarantinedIntent);

      const mockRzpClient = {
        payments: {
          refund: jest.fn(),
        },
      };

      const result = await initiateDurableRefund({
        paymentId: mockPaymentId,
        refundAmount: 1000,
        reason: 'Replay quarantined intent',
        requestedByUser: { _id: mockUserId, role: 'admin' },
        idempotencyKey: 'idemp_key_quarantine',
        razorpayClient: mockRzpClient,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('REFUND_INDETERMINATE');
      expect(result.quarantined).toBe(true);
      expect(mockRzpClient.payments.refund).not.toHaveBeenCalled(); // Zero redispatch
    });

    it('5.5 should mark FAILED on definite gateway error without mutating payment balance', async () => {
      const fakePayment = {
        _id: mockPaymentId,
        status: 'paid',
        amountPaid: 10000,
        refundedAmount: 0,
        razorpayPaymentId: 'pay_test_123',
        save: jest.fn().mockResolvedValue(true),
      };

      const mockRefundIntent = {
        _id: new mongoose.Types.ObjectId(),
        status: 'INTENT_PERSISTED',
        dispatchAttempts: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Payment, 'findById').mockResolvedValue(fakePayment);
      jest.spyOn(RefundIntent, 'findOne').mockResolvedValue(null);
      jest.spyOn(RefundIntent, 'create').mockResolvedValue(mockRefundIntent);

      const definiteError = new Error('Payment has already been fully refunded (400)');

      const mockRzpClient = {
        payments: {
          refund: jest.fn().mockRejectedValue(definiteError),
        },
      };

      const result = await initiateDurableRefund({
        paymentId: mockPaymentId,
        refundAmount: 1000,
        reason: 'Definite error test',
        requestedByUser: { _id: mockUserId, role: 'admin' },
        razorpayClient: mockRzpClient,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(mockRefundIntent.status).toBe('FAILED');
      expect(fakePayment.refundedAmount).toBe(0);
    });

    it('5.6 should settle refund, update payment.refundedAmount, and transition status', async () => {
      const fakePayment = {
        _id: mockPaymentId,
        status: 'paid',
        amountPaid: 10000,
        refundedAmount: 0,
        razorpayPaymentId: 'pay_test_123',
        save: jest.fn().mockResolvedValue(true),
      };

      const mockRefundIntent = {
        _id: new mongoose.Types.ObjectId(),
        status: 'INTENT_PERSISTED',
        dispatchAttempts: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Payment, 'findById').mockResolvedValue(fakePayment);
      jest.spyOn(RefundIntent, 'findOne').mockResolvedValue(null);
      jest.spyOn(RefundIntent, 'create').mockResolvedValue(mockRefundIntent);

      const mockRzpClient = {
        payments: {
          refund: jest.fn().mockResolvedValue({ id: 'rfnd_settled_123' }),
        },
      };

      const result = await initiateDurableRefund({
        paymentId: mockPaymentId,
        refundAmount: 5000,
        reason: 'Partial refund test',
        requestedByUser: { _id: mockUserId, role: 'admin' },
        razorpayClient: mockRzpClient,
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('SETTLED');
      expect(fakePayment.refundedAmount).toBe(5000);
      expect(fakePayment.status).toBe('partially_refunded');
      expect(mockRefundIntent.status).toBe('SETTLED');
      expect(mockRefundIntent.gatewayRefundId).toBe('rfnd_settled_123');
    });

    it('5.7 should return already settled intent on replay without duplicate ledger mutation', async () => {
      const fakePayment = {
        _id: mockPaymentId,
        status: 'partially_refunded',
        amountPaid: 10000,
        refundedAmount: 5000,
        razorpayPaymentId: 'pay_test_123',
      };

      const existingSettledIntent = {
        _id: new mongoose.Types.ObjectId(),
        status: 'SETTLED',
        gatewayRefundId: 'rfnd_existing',
      };

      jest.spyOn(Payment, 'findById').mockResolvedValue(fakePayment);
      jest.spyOn(RefundIntent, 'findOne').mockResolvedValue(existingSettledIntent);

      const mockRzpClient = {
        payments: { refund: jest.fn() },
      };

      const result = await initiateDurableRefund({
        paymentId: mockPaymentId,
        refundAmount: 5000,
        reason: 'Replay check',
        requestedByUser: { _id: mockUserId, role: 'admin' },
        idempotencyKey: 'idemp_settled',
        razorpayClient: mockRzpClient,
      });

      expect(result.success).toBe(true);
      expect(result.alreadySettled).toBe(true);
      expect(mockRzpClient.payments.refund).not.toHaveBeenCalled();
    });

    it('5.8 should reject unauthenticated refund request with HTTP 401', async () => {
      const req = {
        params: { id: mockPaymentId.toString() },
        body: { amount: 1000 },
        user: null,
      };
      const res = {};

      await expect(processPaymentRefund(req, res)).rejects.toThrow(/Unauthorized: Authentication required/);
    });

    it('5.9 should reject unauthorized non-admin user (tenant) from refunding with HTTP 403 and never dispatch gateway', async () => {
      const req = {
        params: { id: mockPaymentId.toString() },
        body: { amount: 1000 },
        user: { _id: mockUserId, role: 'tenant' },
      };
      const res = {};

      await expect(processPaymentRefund(req, res)).rejects.toThrow(/Forbidden: Only Administrators or Super Administrators/);
    });

    it('5.10 should reject unauthorized user in initiateDurableRefund directly with HTTP 403', async () => {
      await expect(
        initiateDurableRefund({
          paymentId: mockPaymentId,
          refundAmount: 1000,
          reason: 'Unauthorized direct service call',
          requestedByUser: { _id: mockUserId, role: 'tenant' },
        })
      ).rejects.toThrow(/Forbidden: Only Administrators or Super Administrators/);
    });
  });

  // =========================================================================
  // 6. Online Payment Safeguards & Invariant Validation
  // =========================================================================
  describe('6. Online Payment Safeguards & Invariant Validation', () => {
    const mockTenantId = new mongoose.Types.ObjectId();
    const mockUserId = new mongoose.Types.ObjectId();
    const mockLeaseId = new mongoose.Types.ObjectId();
    const mockPropertyId = new mongoose.Types.ObjectId();
    const razorpaySecret = (process.env.RAZORPAY_KEY_SECRET || 'J1XPHqYCTE8sSNhNtzarqYaQ').trim();

    const generateSig = (orderId, paymentId) => {
      return crypto.createHmac('sha256', razorpaySecret).update(`${orderId}|${paymentId}`).digest('hex');
    };

    beforeEach(() => {
      jest.spyOn(User, 'findById').mockReturnValue(
        mockMongooseQuery({ _id: mockUserId, email: 'tenant@safe.com' })
      );
      jest.spyOn(Tenant, 'find').mockReturnValue(
        mockMongooseQuery([{ _id: mockTenantId, email: 'tenant@safe.com' }])
      );
    });

    it('6.1 should reject payment verification with altered amount in paise (HTTP 400)', async () => {
      const orderId = 'order_test_111';
      const paymentId = 'pay_test_222';
      const signature = generateSig(orderId, paymentId);

      const fakeLease = {
        _id: mockLeaseId,
        tenant: mockTenantId,
        property: mockPropertyId,
        status: 'active',
        rentAmount: 15000,
        startDate: new Date('2026-01-01'),
        populate: jest.fn().mockResolvedValue(this),
      };

      jest.spyOn(Lease, 'findById').mockReturnValue(mockMongooseQuery(fakeLease));
      jest.spyOn(Payment, 'find').mockReturnValue(mockMongooseQuery([]));
      jest.spyOn(Payment, 'findOne').mockReturnValue(mockMongooseQuery(null));
      jest.spyOn(CheckoutSession, 'findOne').mockResolvedValue({
        _id: 'chk_test',
        activeOrderId: orderId,
        tenantId: mockTenantId,
        targetId: mockLeaseId,
      });

      const req = {
        user: { userId: mockUserId, role: 'tenant' },
        body: {
          leaseId: mockLeaseId.toString(),
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
          amountInPaise: 999999, // Altered! Expected 1515000 (15000 + 1% platform fee)
        },
      };
      const res = {};

      await expect(verifyRazorpayRentPayment(req, res)).rejects.toThrow(/Payment amount mismatch/);
    });

    it('6.2 should reject payment verification with altered currency (non-INR) (HTTP 400)', async () => {
      const orderId = 'order_test_curr';
      const paymentId = 'pay_test_curr';
      const signature = generateSig(orderId, paymentId);

      const fakeLease = {
        _id: mockLeaseId,
        tenant: mockTenantId,
        property: mockPropertyId,
        status: 'active',
        rentAmount: 15000,
        startDate: new Date('2026-01-01'),
        populate: jest.fn().mockResolvedValue(this),
      };

      jest.spyOn(Lease, 'findById').mockReturnValue(mockMongooseQuery(fakeLease));
      jest.spyOn(CheckoutSession, 'findOne').mockResolvedValue({
        _id: 'chk_curr',
        activeOrderId: orderId,
        tenantId: mockTenantId,
        targetId: mockLeaseId,
      });

      const req = {
        user: { userId: mockUserId, role: 'tenant' },
        body: {
          leaseId: mockLeaseId.toString(),
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
          currency: 'USD', // Altered currency!
        },
      };
      const res = {};

      await expect(verifyRazorpayRentPayment(req, res)).rejects.toThrow(/Invalid payment currency: expected INR/);
    });

    it('6.3 should reject payment verification with non-captured and non-authorized gateway status (HTTP 400)', async () => {
      const orderId = 'order_test_stat';
      const paymentId = 'pay_test_stat';
      const signature = generateSig(orderId, paymentId);

      const fakeLease = {
        _id: mockLeaseId,
        tenant: mockTenantId,
        property: mockPropertyId,
        status: 'active',
        rentAmount: 15000,
        startDate: new Date(),
        populate: jest.fn().mockResolvedValue(this),
      };

      jest.spyOn(Lease, 'findById').mockReturnValue(mockMongooseQuery(fakeLease));
      jest.spyOn(Payment, 'find').mockReturnValue(mockMongooseQuery([]));
      jest.spyOn(Payment, 'findOne').mockReturnValue(mockMongooseQuery(null));
      jest.spyOn(CheckoutSession, 'findOne').mockResolvedValue({
        _id: 'chk_stat',
        activeOrderId: orderId,
        tenantId: mockTenantId,
        targetId: mockLeaseId,
      });

      const req = {
        user: { userId: mockUserId, role: 'tenant' },
        razorpayClient: {
          payments: {
            fetch: jest.fn().mockResolvedValue({
              id: paymentId,
              order_id: orderId,
              amount: 1515000,
              currency: 'INR',
              status: 'failed', // Non-captured and non-authorized status from gateway!
            }),
          },
        },
        body: {
          leaseId: mockLeaseId.toString(),
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        },
      };
      const res = {};

      await expect(verifyRazorpayRentPayment(req, res)).rejects.toThrow(/Gateway payment verification failed: payment status is "failed"/);
    });

    it('6.4 should reject client-forged captured request-body value when gateway reports authorized (prevents false settlement & revenue)', async () => {
      const orderId = 'order_test_forged';
      const paymentId = 'pay_test_forged';
      const signature = generateSig(orderId, paymentId);

      const fakeLease = {
        _id: mockLeaseId,
        tenant: mockTenantId,
        property: mockPropertyId,
        status: 'active',
        rentAmount: 15000,
        startDate: new Date(),
        populate: jest.fn().mockResolvedValue(this),
      };

      jest.spyOn(Lease, 'findById').mockReturnValue(mockMongooseQuery(fakeLease));
      jest.spyOn(Payment, 'find').mockReturnValue(mockMongooseQuery([]));
      jest.spyOn(Payment, 'findOne').mockReturnValue(mockMongooseQuery(null));
      const paymentCreateSpy = jest.spyOn(Payment, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'pending',
        amountPaid: 0,
        providerStatus: 'authorized',
      });
      jest.spyOn(mongoose.model('Bill'), 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'due',
        amountPaid: 0,
        save: jest.fn().mockResolvedValue(true),
      });
      jest.spyOn(CheckoutSession, 'findOne').mockResolvedValue({
        _id: 'chk_forged',
        activeOrderId: orderId,
        tenantId: mockTenantId,
        targetId: mockLeaseId,
      });

      const req = {
        user: { userId: mockUserId, role: 'tenant' },
        razorpayClient: {
          payments: {
            fetch: jest.fn().mockResolvedValue({
              id: paymentId,
              order_id: orderId,
              amount: 1515000,
              currency: 'INR',
              status: 'authorized', // Gateway entity is ONLY authorized!
            }),
          },
        },
        body: {
          leaseId: mockLeaseId.toString(),
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
          providerStatus: 'captured', // Client attempts to FORGE "captured"!
        },
      };

      let jsonResponse = null;
      let statusCode = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => {
              jsonResponse = data;
              return data;
            },
          };
        },
      };

      await verifyRazorpayRentPayment(req, res);

      // Server MUST ignore forged providerStatus: "captured" and remain pending with 0 paid
      expect(statusCode).toBe(200);
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.data.status).toBe('pending');
      expect(jsonResponse.data.providerStatus).toBe('authorized');
      expect(jsonResponse.data.totalPaid).toBe(0);
      expect(jsonResponse.data.settled).toBe(false);

      expect(paymentCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          amountPaid: 0,
          providerStatus: 'authorized',
        })
      );
    });

    it('6.5 should not default missing status to captured; when status is omitted from request body, gateway status rules', async () => {
      const orderId = 'order_test_missing_stat';
      const paymentId = 'pay_test_missing_stat';
      const signature = generateSig(orderId, paymentId);

      const fakeLease = {
        _id: mockLeaseId,
        tenant: mockTenantId,
        property: mockPropertyId,
        status: 'active',
        rentAmount: 15000,
        startDate: new Date(),
        populate: jest.fn().mockResolvedValue(this),
      };

      jest.spyOn(Lease, 'findById').mockReturnValue(mockMongooseQuery(fakeLease));
      jest.spyOn(Payment, 'find').mockReturnValue(mockMongooseQuery([]));
      jest.spyOn(Payment, 'findOne').mockReturnValue(mockMongooseQuery(null));
      const paymentCreateSpy = jest.spyOn(Payment, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'pending',
        amountPaid: 0,
        providerStatus: 'authorized',
      });
      jest.spyOn(mongoose.model('Bill'), 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'due',
        amountPaid: 0,
        save: jest.fn().mockResolvedValue(true),
      });
      jest.spyOn(CheckoutSession, 'findOne').mockResolvedValue({
        _id: 'chk_missing_stat',
        activeOrderId: orderId,
        tenantId: mockTenantId,
        targetId: mockLeaseId,
      });

      const req = {
        user: { userId: mockUserId, role: 'tenant' },
        razorpayClient: {
          payments: {
            fetch: jest.fn().mockResolvedValue({
              id: paymentId,
              order_id: orderId,
              amount: 1515000,
              currency: 'INR',
              status: 'authorized', // Gateway is authorized
            }),
          },
        },
        body: {
          leaseId: mockLeaseId.toString(),
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
          // providerStatus is completely OMITTED!
        },
      };

      let jsonResponse = null;
      let statusCode = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => {
              jsonResponse = data;
              return data;
            },
          };
        },
      };

      await verifyRazorpayRentPayment(req, res);

      // Must NOT default to captured! Must be pending with 0 paid
      expect(statusCode).toBe(200);
      expect(jsonResponse.data.status).toBe('pending');
      expect(jsonResponse.data.providerStatus).toBe('authorized');
      expect(jsonResponse.data.totalPaid).toBe(0);
      expect(jsonResponse.data.settled).toBe(false);

      expect(paymentCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          amountPaid: 0,
          providerStatus: 'authorized',
        })
      );
    });

    it('6.6 should mark payment as paid, amountPaid as totalDue, and confirm settlement when gateway status is confirmed captured', async () => {
      const orderId = 'order_test_cap_confirmed';
      const paymentId = 'pay_test_cap_confirmed';
      const signature = generateSig(orderId, paymentId);

      const fakeLease = {
        _id: mockLeaseId,
        tenant: mockTenantId,
        property: mockPropertyId,
        status: 'active',
        rentAmount: 15000,
        startDate: new Date(),
        populate: jest.fn().mockResolvedValue(this),
      };

      jest.spyOn(Lease, 'findById').mockReturnValue(mockMongooseQuery(fakeLease));
      jest.spyOn(Payment, 'find').mockReturnValue(mockMongooseQuery([]));
      jest.spyOn(Payment, 'findOne').mockReturnValue(mockMongooseQuery(null));
      jest.spyOn(Payment, 'findByIdAndUpdate').mockReturnValue(mockMongooseQuery({ _id: new mongoose.Types.ObjectId() }));
      jest.spyOn(PaymentTransaction, 'findOne').mockReturnValue(mockMongooseQuery(null));
      jest.spyOn(PaymentTransaction, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        platformRevenue: 150,
      });
      const paymentCreateSpy = jest.spyOn(Payment, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'paid',
        amountPaid: 15150,
        providerStatus: 'captured',
        tenant: null,
        property: null,
      });
      jest.spyOn(mongoose.model('Bill'), 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'paid',
        amountPaid: 15150,
        save: jest.fn().mockResolvedValue(true),
      });
      jest.spyOn(CheckoutSession, 'findOne').mockResolvedValue({
        _id: 'chk_cap_confirmed',
        activeOrderId: orderId,
        tenantId: mockTenantId,
        targetId: mockLeaseId,
      });

      const req = {
        user: { userId: mockUserId, role: 'tenant' },
        razorpayClient: {
          payments: {
            fetch: jest.fn().mockResolvedValue({
              id: paymentId,
              order_id: orderId,
              amount: 1515000,
              currency: 'INR',
              status: 'captured', // Gateway confirmed captured!
            }),
          },
        },
        body: {
          leaseId: mockLeaseId.toString(),
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        },
      };

      let jsonResponse = null;
      let statusCode = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => {
              jsonResponse = data;
              return data;
            },
          };
        },
      };

      await verifyRazorpayRentPayment(req, res);

      expect(statusCode).toBe(200);
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.data.status).toBe('paid');
      expect(jsonResponse.data.totalPaid).toBe(15150);

      expect(paymentCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'paid',
          amountPaid: 15150,
          providerStatus: 'captured',
        })
      );
    });

    it('6.7 should reject payment verification when gateway entity paymentId mismatches request (HTTP 400)', async () => {
      const orderId = 'order_test_pay_mismatch';
      const paymentId = 'pay_test_expected';
      const signature = generateSig(orderId, paymentId);

      const fakeLease = {
        _id: mockLeaseId,
        tenant: mockTenantId,
        property: mockPropertyId,
        status: 'active',
        rentAmount: 15000,
        startDate: new Date(),
        populate: jest.fn().mockResolvedValue(this),
      };

      jest.spyOn(Lease, 'findById').mockReturnValue(mockMongooseQuery(fakeLease));
      jest.spyOn(Payment, 'find').mockReturnValue(mockMongooseQuery([]));
      jest.spyOn(Payment, 'findOne').mockReturnValue(mockMongooseQuery(null));
      jest.spyOn(CheckoutSession, 'findOne').mockResolvedValue({
        _id: 'chk_pay_mismatch',
        activeOrderId: orderId,
        tenantId: mockTenantId,
        targetId: mockLeaseId,
      });

      const req = {
        user: { userId: mockUserId, role: 'tenant' },
        razorpayClient: {
          payments: {
            fetch: jest.fn().mockResolvedValue({
              id: 'pay_DIFFERENT_id', // Gateway returns a different payment ID!
              order_id: orderId,
              amount: 1515000,
              currency: 'INR',
              status: 'captured',
            }),
          },
        },
        body: {
          leaseId: mockLeaseId.toString(),
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        },
      };
      const res = {};

      await expect(verifyRazorpayRentPayment(req, res)).rejects.toThrow(/Gateway verification failed: payment identifier mismatch/);
    });

    it('6.8 should reject payment verification when gateway entity orderId mismatches request (HTTP 400)', async () => {
      const orderId = 'order_test_expected';
      const paymentId = 'pay_test_order_mismatch';
      const signature = generateSig(orderId, paymentId);

      const fakeLease = {
        _id: mockLeaseId,
        tenant: mockTenantId,
        property: mockPropertyId,
        status: 'active',
        rentAmount: 15000,
        startDate: new Date(),
        populate: jest.fn().mockResolvedValue(this),
      };

      jest.spyOn(Lease, 'findById').mockReturnValue(mockMongooseQuery(fakeLease));
      jest.spyOn(Payment, 'find').mockReturnValue(mockMongooseQuery([]));
      jest.spyOn(Payment, 'findOne').mockReturnValue(mockMongooseQuery(null));
      jest.spyOn(CheckoutSession, 'findOne').mockResolvedValue({
        _id: 'chk_order_mismatch',
        activeOrderId: orderId,
        tenantId: mockTenantId,
        targetId: mockLeaseId,
      });

      const req = {
        user: { userId: mockUserId, role: 'tenant' },
        razorpayClient: {
          payments: {
            fetch: jest.fn().mockResolvedValue({
              id: paymentId,
              order_id: 'order_DIFFERENT_id', // Gateway returns a different order ID!
              amount: 1515000,
              currency: 'INR',
              status: 'captured',
            }),
          },
        },
        body: {
          leaseId: mockLeaseId.toString(),
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        },
      };
      const res = {};

      await expect(verifyRazorpayRentPayment(req, res)).rejects.toThrow(/Gateway verification failed: order identifier mismatch/);
    });

    it('6.9 should fail closed when gateway verification is unavailable (network error / HTTP 502) without settling payment or recognizing revenue', async () => {
      const orderId = 'order_test_unavail';
      const paymentId = 'pay_test_unavail';
      const signature = generateSig(orderId, paymentId);

      const fakeLease = {
        _id: mockLeaseId,
        tenant: mockTenantId,
        property: mockPropertyId,
        status: 'active',
        rentAmount: 15000,
        startDate: new Date(),
        populate: jest.fn().mockResolvedValue(this),
      };

      jest.spyOn(Lease, 'findById').mockReturnValue(mockMongooseQuery(fakeLease));
      jest.spyOn(Payment, 'find').mockReturnValue(mockMongooseQuery([]));
      jest.spyOn(Payment, 'findOne').mockReturnValue(mockMongooseQuery(null));
      const paymentCreateSpy = jest.spyOn(Payment, 'create');
      const billCreateSpy = jest.spyOn(mongoose.model('Bill'), 'create');
      jest.spyOn(CheckoutSession, 'findOne').mockResolvedValue({
        _id: 'chk_unavail',
        activeOrderId: orderId,
        tenantId: mockTenantId,
        targetId: mockLeaseId,
      });

      const req = {
        user: { userId: mockUserId, role: 'tenant' },
        razorpayClient: {
          payments: {
            fetch: jest.fn().mockRejectedValue(new Error('Razorpay network gateway timeout')),
          },
        },
        body: {
          leaseId: mockLeaseId.toString(),
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        },
      };
      const res = {};

      await expect(verifyRazorpayRentPayment(req, res)).rejects.toThrow(/Gateway verification unavailable: unable to fetch payment entity/);

      // Verify zero records were created or settled
      expect(paymentCreateSpy).not.toHaveBeenCalled();
      expect(billCreateSpy).not.toHaveBeenCalled();
    });

    it('6.10 should reject payment verification when order ID belongs to a different tenant (HTTP 403)', async () => {
      const orderId = 'order_test_foreign';
      const paymentId = 'pay_test_foreign';
      const signature = generateSig(orderId, paymentId);
      const foreignTenantId = new mongoose.Types.ObjectId();

      const fakeLease = {
        _id: mockLeaseId,
        tenant: mockTenantId,
        property: mockPropertyId,
        status: 'active',
        rentAmount: 15000,
        startDate: new Date('2026-01-01'),
        populate: jest.fn().mockResolvedValue(this),
      };

      jest.spyOn(Lease, 'findById').mockReturnValue(mockMongooseQuery(fakeLease));
      jest.spyOn(CheckoutSession, 'findOne').mockResolvedValue({
        _id: 'chk_foreign',
        activeOrderId: orderId,
        tenantId: foreignTenantId, // Different tenant!
        targetId: mockLeaseId,
      });

      const req = {
        user: { userId: mockUserId, role: 'tenant' },
        body: {
          leaseId: mockLeaseId.toString(),
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        },
      };
      const res = {};

      await expect(verifyRazorpayRentPayment(req, res)).rejects.toThrow(/Razorpay order does not belong to this tenant or obligation/);
    });

    it('6.11 should reject payment verification when order ID is completely unbound (HTTP 400)', async () => {
      const orderId = 'order_test_unbound';
      const paymentId = 'pay_test_unbound';
      const signature = generateSig(orderId, paymentId);

      const fakeLease = {
        _id: mockLeaseId,
        tenant: mockTenantId,
        property: mockPropertyId,
        status: 'active',
        rentAmount: 15000,
        startDate: new Date('2026-01-01'),
        populate: jest.fn().mockResolvedValue(this),
      };

      jest.spyOn(Lease, 'findById').mockReturnValue(mockMongooseQuery(fakeLease));
      jest.spyOn(CheckoutSession, 'findOne').mockResolvedValue(null);
      jest.spyOn(Payment, 'findOne').mockReturnValue(mockMongooseQuery(null));

      const req = {
        user: { userId: mockUserId, role: 'tenant' },
        body: {
          leaseId: mockLeaseId.toString(),
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        },
      };
      const res = {};

      await expect(verifyRazorpayRentPayment(req, res)).rejects.toThrow(/Razorpay order is not bound to a valid checkout session/);
    });

    it('6.12 should return durable record on idempotent replay of paid payment without mutating ledger', async () => {
      const orderId = 'order_test_replay';
      const paymentId = 'pay_test_replay';
      const signature = generateSig(orderId, paymentId);

      const fakeLease = {
        _id: mockLeaseId,
        tenant: mockTenantId,
        property: mockPropertyId,
        status: 'active',
        rentAmount: 15000,
        startDate: new Date('2026-01-01'),
        populate: jest.fn().mockResolvedValue(this),
      };

      const existingPaidPayment = {
        _id: new mongoose.Types.ObjectId(),
        tenant: mockTenantId,
        status: 'paid',
        amountPaid: 15150,
        razorpayPaymentId: paymentId,
        toObject: () => ({ _id: 'pay_obj', status: 'paid', amountPaid: 15150 }),
      };

      jest.spyOn(Lease, 'findById').mockReturnValue(mockMongooseQuery(fakeLease));
      jest.spyOn(CheckoutSession, 'findOne').mockResolvedValue({
        _id: 'chk_replay',
        activeOrderId: orderId,
        tenantId: mockTenantId,
        targetId: mockLeaseId,
      });
      jest.spyOn(Payment, 'findOne').mockReturnValue(mockMongooseQuery(existingPaidPayment));

      const req = {
        user: { userId: mockUserId, role: 'tenant' },
        headers: {},
        protocol: 'http',
        get: () => 'localhost:5000',
        body: {
          leaseId: mockLeaseId.toString(),
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        },
      };

      let jsonResponse = null;
      let statusCode = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => {
              jsonResponse = data;
              return data;
            },
          };
        },
      };

      await verifyRazorpayRentPayment(req, res);

      expect(statusCode).toBe(200);
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.data.alreadySettled).toBe(true);
      expect(jsonResponse.data.status).toBe('paid');
    });
  });

  // =========================================================================
  // 7. Strengthened Invoice 3-Point Reconciliation
  // =========================================================================
  describe('7. Strengthened Invoice 3-Point Reconciliation', () => {
    const mockPaymentId = new mongoose.Types.ObjectId();
    const mockFileId = new mongoose.Types.ObjectId();

    it('7.1 should fail reconciliation and maintain quarantine if object key mismatches expected key', async () => {
      const fakePayment = {
        _id: mockPaymentId,
        fileId: mockFileId,
        sideEffects: {
          invoice: {
            status: 'COMMIT_INDETERMINATE',
            key: 'invoices/expected_invoice_key.pdf',
            leaseVersion: 1,
          },
        },
        save: jest.fn(),
      };

      const fakeFileMeta = {
        _id: mockFileId,
        key: 'invoices/mismatched_invoice_key.pdf', // Mismatch!
        publicationState: 'COMMITTED',
        leaseVersion: 1,
        relatedEntity: mockPaymentId,
      };

      jest.spyOn(Payment, 'findById').mockResolvedValue(fakePayment);
      jest.spyOn(FileMetadata, 'findById').mockResolvedValue(fakeFileMeta);

      const result = await reconcileQuarantinedInvoice({
        paymentId: mockPaymentId,
        storageCheckFn: jest.fn().mockResolvedValue(true),
      });

      expect(result.reconciled).toBe(false);
      expect(result.reason).toMatch(/Object key mismatch against expected invoice key/i);
      expect(fakePayment.sideEffects.invoice.status).toBe('COMMIT_INDETERMINATE');
    });

    it('7.2 should fail reconciliation and maintain quarantine if leaseVersion mismatches expected version', async () => {
      const fakePayment = {
        _id: mockPaymentId,
        fileId: mockFileId,
        sideEffects: {
          invoice: {
            status: 'COMMIT_INDETERMINATE',
            key: 'invoices/inv_v2.pdf',
            leaseVersion: 2, // Expected v2
          },
        },
        save: jest.fn(),
      };

      const fakeFileMeta = {
        _id: mockFileId,
        key: 'invoices/inv_v2.pdf',
        publicationState: 'COMMITTED',
        leaseVersion: 1, // Stored v1 mismatch!
        relatedEntity: mockPaymentId,
      };

      jest.spyOn(Payment, 'findById').mockResolvedValue(fakePayment);
      jest.spyOn(FileMetadata, 'findById').mockResolvedValue(fakeFileMeta);

      const result = await reconcileQuarantinedInvoice({
        paymentId: mockPaymentId,
        storageCheckFn: jest.fn().mockResolvedValue(true),
      });

      expect(result.reconciled).toBe(false);
      expect(result.reason).toMatch(/Invoice lease version mismatch/i);
      expect(fakePayment.sideEffects.invoice.status).toBe('COMMIT_INDETERMINATE');
    });

    it('7.3 should fail reconciliation and maintain quarantine if sha256 checksum mismatches stored metadata', async () => {
      const fakePayment = {
        _id: mockPaymentId,
        fileId: mockFileId,
        sideEffects: {
          invoice: {
            status: 'COMMIT_INDETERMINATE',
            key: 'invoices/inv_chk.pdf',
            leaseVersion: 1,
          },
        },
        save: jest.fn(),
      };

      const fakeFileMeta = {
        _id: mockFileId,
        key: 'invoices/inv_chk.pdf',
        publicationState: 'COMMITTED',
        leaseVersion: 1,
        relatedEntity: mockPaymentId,
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      };

      jest.spyOn(Payment, 'findById').mockResolvedValue(fakePayment);
      jest.spyOn(FileMetadata, 'findById').mockResolvedValue(fakeFileMeta);

      const mockStorageCheck = jest.fn().mockResolvedValue({
        exists: true,
        sha256: 'corrupted_or_different_hash_value', // Mismatch!
        size: 1024,
      });

      const result = await reconcileQuarantinedInvoice({
        paymentId: mockPaymentId,
        storageCheckFn: mockStorageCheck,
      });

      expect(result.reconciled).toBe(false);
      expect(result.reason).toMatch(/Checksum mismatch/i);
      expect(fakePayment.sideEffects.invoice.status).toBe('COMMIT_INDETERMINATE');
    });

    it('7.4 should fail reconciliation and maintain quarantine if FileMetadata relatedEntity mismatches payment ID', async () => {
      const fakePayment = {
        _id: mockPaymentId,
        fileId: mockFileId,
        sideEffects: {
          invoice: {
            status: 'COMMIT_INDETERMINATE',
            key: 'invoices/inv_ent.pdf',
            leaseVersion: 1,
          },
        },
        save: jest.fn(),
      };

      const fakeFileMeta = {
        _id: mockFileId,
        key: 'invoices/inv_ent.pdf',
        publicationState: 'COMMITTED',
        leaseVersion: 1,
        relatedEntity: new mongoose.Types.ObjectId(), // Different entity!
      };

      jest.spyOn(Payment, 'findById').mockResolvedValue(fakePayment);
      jest.spyOn(FileMetadata, 'findById').mockResolvedValue(fakeFileMeta);

      const result = await reconcileQuarantinedInvoice({
        paymentId: mockPaymentId,
        storageCheckFn: jest.fn().mockResolvedValue(true),
      });

      expect(result.reconciled).toBe(false);
      expect(result.reason).toMatch(/FileMetadata relatedEntity mismatch/i);
      expect(fakePayment.sideEffects.invoice.status).toBe('COMMIT_INDETERMINATE');
    });

    it('7.5 should successfully reconcile and release quarantine when all 3 points, version, and checksum match', async () => {
      const fakePayment = {
        _id: mockPaymentId,
        fileId: mockFileId,
        sideEffects: {
          invoice: {
            status: 'COMMIT_INDETERMINATE',
            key: 'invoices/inv_valid.pdf',
            leaseVersion: 1,
          },
        },
        save: jest.fn().mockResolvedValue(true),
      };

      const fakeFileMeta = {
        _id: mockFileId,
        key: 'invoices/inv_valid.pdf',
        publicationState: 'COMMITTED',
        leaseVersion: 1,
        relatedEntity: mockPaymentId,
        sha256: 'valid_sha256_hash_12345',
      };

      jest.spyOn(Payment, 'findById').mockResolvedValue(fakePayment);
      jest.spyOn(FileMetadata, 'findById').mockResolvedValue(fakeFileMeta);

      const mockStorageCheck = jest.fn().mockResolvedValue({
        exists: true,
        sha256: 'valid_sha256_hash_12345',
        size: 2048,
      });

      const result = await reconcileQuarantinedInvoice({
        paymentId: mockPaymentId,
        storageCheckFn: mockStorageCheck,
      });

      expect(result.reconciled).toBe(true);
      expect(fakePayment.sideEffects.invoice.status).toBe('COMMITTED');
      expect(fakePayment.invoiceUrl).toBe(`/api/files/download/${mockFileId}`);
      expect(fakePayment.save).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 8. Super Admin Privilege & Four-Eyes Guard
  // =========================================================================
  describe('8. Super Admin Privilege & Four-Eyes Guard', () => {
    it('8.1 superAdminOnly middleware should allow user with role super_admin', () => {
      const req = { user: { _id: 'u1', role: 'super_admin' } };
      const res = {};
      const next = jest.fn();

      superAdminOnly(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('8.2 superAdminOnly middleware should allow user with isSuperAdmin: true', () => {
      const req = { user: { _id: 'u2', role: 'admin', isSuperAdmin: true } };
      const res = {};
      const next = jest.fn();

      superAdminOnly(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('8.3 superAdminOnly middleware should strictly reject generic admin with HTTP 403', () => {
      const req = { user: { _id: 'u3', role: 'admin', isSuperAdmin: false } };
      const res = {};
      const next = jest.fn();

      expect(() => superAdminOnly(req, res, next)).toThrow(/Forbidden: Requires Super Administrator privileges/);
      expect(next).not.toHaveBeenCalled();
    });

    it('8.4 superAdminOnly middleware should reject unauthenticated request with HTTP 401', () => {
      const req = { user: null };
      const res = {};
      const next = jest.fn();

      expect(() => superAdminOnly(req, res, next)).toThrow(/Unauthorized access/);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 9. Super-Admin Privilege Protection & Anti-Escalation Guards
  // =========================================================================
  describe('9. Super-Admin Privilege Protection & Anti-Escalation Guards', () => {
    it('9.1 register should reject privilege escalation when role is super_admin (HTTP 403)', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      const req = {
        body: {
          firstName: 'Attacker',
          lastName: 'User',
          email: 'attacker@evil.com',
          password: 'Password123!',
          role: 'super_admin',
        },
      };
      const res = {};
      await expect(register(req, res)).rejects.toThrow(/Privilege escalation forbidden during registration/);
    });

    it('9.2 register should reject privilege escalation when isSuperAdmin is passed (HTTP 403)', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      const req = {
        body: {
          firstName: 'Attacker',
          lastName: 'User',
          email: 'attacker2@evil.com',
          password: 'Password123!',
          isSuperAdmin: true,
        },
      };
      const res = {};
      await expect(register(req, res)).rejects.toThrow(/Privilege escalation forbidden during registration/);
    });

    it('9.3 updateProfile should reject attempted role modification (HTTP 403)', async () => {
      const req = {
        user: { userId: 'u_profile' },
        body: { role: 'super_admin' },
      };
      const res = {};
      await expect(updateProfile(req, res)).rejects.toThrow(/Profile updates cannot modify role or isSuperAdmin/);
    });

    it('9.4 updateProfile should reject attempted isSuperAdmin modification (HTTP 403)', async () => {
      const req = {
        user: { userId: 'u_profile' },
        body: { isSuperAdmin: true },
      };
      const res = {};
      await expect(updateProfile(req, res)).rejects.toThrow(/Profile updates cannot modify role or isSuperAdmin/);
    });

    it('9.5 createUser by non-super-admin should reject role: super_admin or isSuperAdmin: true (HTTP 403)', async () => {
      const req = {
        user: { userId: 'u_admin', role: 'admin', isSuperAdmin: false },
        body: {
          firstName: 'New',
          lastName: 'Admin',
          email: 'newadmin@test.com',
          password: 'Password123!',
          role: 'super_admin',
        },
      };
      const res = {};
      await expect(createUser(req, res)).rejects.toThrow(/Only Super Administrators can grant super_admin role/);
    });

    it('9.6 updateUser by non-super-admin should reject setting role: super_admin or isSuperAdmin: true (HTTP 403)', async () => {
      const targetId = new mongoose.Types.ObjectId();
      const req = {
        params: { id: targetId.toString() },
        user: { userId: 'u_admin', role: 'admin', isSuperAdmin: false },
        body: { isSuperAdmin: true },
      };
      const res = {};
      await expect(updateUser(req, res)).rejects.toThrow(/Only Super Administrators can grant or modify super_admin role/);
    });

    it('9.7 updateUser by non-super-admin targeting existing super_admin should reject modification (HTTP 403)', async () => {
      const targetId = new mongoose.Types.ObjectId();
      jest.spyOn(User, 'findById').mockReturnValue(mockMongooseQuery({
        _id: targetId,
        role: 'super_admin',
        isSuperAdmin: true,
      }));
      const req = {
        params: { id: targetId.toString() },
        user: { userId: 'u_admin', role: 'admin', isSuperAdmin: false },
        body: { firstName: 'TamperedName' },
      };
      const res = {};
      await expect(updateUser(req, res)).rejects.toThrow(/Cannot modify an account with Super Administrator privileges/);
    });

    it('9.8 assignRole by non-super-admin should reject setting super_admin (HTTP 403)', async () => {
      const targetId = new mongoose.Types.ObjectId();
      const req = {
        params: { id: targetId.toString() },
        user: { userId: 'u_admin', role: 'admin', isSuperAdmin: false },
        body: { role: 'super_admin' },
      };
      const res = {};
      await expect(assignRole(req, res)).rejects.toThrow(/Only Super Administrators can assign the super_admin role/);
    });
  });
});

