import crypto from 'crypto';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import FileMetadata from '../models/FileMetadata.js';
import FileStorage from '../models/FileStorage.js';
import { runTransactionWithRetry, TransactionOutcome } from '../utils/transactionRunner.js';
import { uploadFileBuffer } from './fileService.js';
import logger from '../utils/logger.js';

/**
 * Stages an invoice file in storage and creates FileMetadata with publicationState = 'STAGED'.
 */
export async function stageInvoiceFile({ paymentId, pdfBuffer, leaseVersion = 1 }) {
  const filename = `invoice_${paymentId}_v${leaseVersion}.pdf`;

  // Staging upload
  const record = await uploadFileBuffer({
    buffer: pdfBuffer,
    filename,
    mimeType: 'application/pdf',
    category: 'invoices',
    relatedEntityId: paymentId,
    relatedModelName: 'Payment',
  });

  // Explicitly ensure publicationState is STAGED
  record.publicationState = 'STAGED';
  record.leaseVersion = leaseVersion;
  await record.save();

  logger.info(`[InvoicePublication] Staged invoice file ${record.key} (fileId: ${record._id}) for Payment ${paymentId}`);
  return record;
}

/**
 * Atomically commits FileMetadata to 'COMMITTED' and updates Payment.fileId and sideEffects.invoice.
 * Handles uncertain commit outcomes with COMMIT_INDETERMINATE quarantine.
 */
export async function commitInvoicePublicationAtomic({
  paymentId,
  fileId,
  fileKey,
  leaseVersion = 1,
  mongooseInstance = mongoose,
}) {
  const downloadUrl = `/api/files/download/${fileId}`;

  const txnResult = await runTransactionWithRetry(
    async (session) => {
      // 1. Mark FileMetadata as COMMITTED
      const updatedMeta = await FileMetadata.findOneAndUpdate(
        { _id: fileId, publicationState: { $in: ['STAGED', 'COMMITTED'] } },
        {
          $set: {
            publicationState: 'COMMITTED',
            committedAt: new Date(),
            leaseVersion,
          },
        },
        { session, new: true }
      );

      if (!updatedMeta) {
        throw new Error(`FileMetadata ${fileId} not found or in invalid state`);
      }

      // 2. Update Payment record with fileId and committed invoice sideEffect
      const updatedPayment = await Payment.findOneAndUpdate(
        { _id: paymentId },
        {
          $set: {
            fileId: fileId,
            invoiceUrl: downloadUrl,
            'sideEffects.invoice.status': 'COMMITTED',
            'sideEffects.invoice.fileId': fileId,
            'sideEffects.invoice.key': fileKey,
            'sideEffects.invoice.leaseVersion': leaseVersion,
            'sideEffects.invoice.updatedAt': new Date(),
          },
          $inc: { 'sideEffects.invoice.attempt': 1 },
        },
        { session, new: true }
      );

      if (!updatedPayment) {
        throw new Error(`Payment ${paymentId} not found during invoice publication commit`);
      }

      return { payment: updatedPayment, fileMetadata: updatedMeta };
    },
    {
      clientOrMongoose: mongooseInstance,
      operationName: `InvoiceCommit-${paymentId}`,
      reconciliationFn: async (session) => {
        // Read-only majority reconciliation on commit uncertainty
        const meta = await FileMetadata.findById(fileId).session(session);
        const pay = await Payment.findById(paymentId).session(session);
        if (
          meta &&
          meta.publicationState === 'COMMITTED' &&
          pay &&
          pay.fileId &&
          pay.fileId.toString() === fileId.toString()
        ) {
          return { confirmedCommitted: true, result: { payment: pay, fileMetadata: meta } };
        }
        return { confirmedCommitted: false };
      },
    }
  );

  if (txnResult.outcome === TransactionOutcome.COMMITTED) {
    logger.info(`[InvoicePublication] Invoice publication COMMITTED for Payment ${paymentId}`);
    return {
      success: true,
      outcome: TransactionOutcome.COMMITTED,
      fileId,
      invoiceUrl: downloadUrl,
    };
  }

  if (txnResult.outcome === TransactionOutcome.INDETERMINATE_COMMIT) {
    // Durable quarantine hold: set status to COMMIT_INDETERMINATE
    logger.error(`[InvoicePublication] Invoice commit outcome INDETERMINATE for Payment ${paymentId}. Quarantining.`);
    await Payment.findByIdAndUpdate(paymentId, {
      $set: {
        'sideEffects.invoice.status': 'COMMIT_INDETERMINATE',
        'sideEffects.invoice.fileId': fileId,
        'sideEffects.invoice.key': fileKey,
        'sideEffects.invoice.updatedAt': new Date(),
        'sideEffects.invoice.lastError': 'Commit outcome indeterminate after retries. Quarantined.',
      },
    });

    return {
      success: false,
      outcome: TransactionOutcome.INDETERMINATE_COMMIT,
      fileId,
      quarantined: true,
      message: 'Invoice commit outcome indeterminate; locked in quarantine.',
    };
  }

  // Aborted or failed
  logger.warn(`[InvoicePublication] Invoice publication aborted with outcome ${txnResult.outcome}: ${txnResult.error?.message}`);
  await Payment.findByIdAndUpdate(paymentId, {
    $set: {
      'sideEffects.invoice.status': 'FAILED',
      'sideEffects.invoice.updatedAt': new Date(),
      'sideEffects.invoice.lastError': txnResult.error?.message,
    },
  });

  return {
    success: false,
    outcome: txnResult.outcome,
    error: txnResult.error?.message,
  };
}

/**
 * 3-point reconciliation for quarantined invoices.
 * NEVER releases quarantine, re-renders, or deletes storage objects based solely on elapsed time!
 * Requires:
 * 1. Payment.fileId matches FileMetadata._id and relatedEntity matches paymentId.
 * 2. FileMetadata.publicationState === 'COMMITTED' and version matches expected leaseVersion.
 * 3. Physical storage object exists with matching key, non-zero size, and matching sha256 checksum when available.
 */
export async function reconcileQuarantinedInvoice({
  paymentId,
  storageCheckFn = null,
}) {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    return { reconciled: false, reason: 'Payment not found' };
  }

  const invoiceState = payment.sideEffects?.invoice?.status;
  if (invoiceState !== 'COMMIT_INDETERMINATE') {
    return { reconciled: false, reason: `Invoice is not quarantined (status: ${invoiceState})` };
  }

  const targetFileId = payment.sideEffects?.invoice?.fileId || payment.fileId;
  if (!targetFileId) {
    return { reconciled: false, reason: 'No fileId linked in quarantined invoice record' };
  }

  // Check 1: FileMetadata exists and is COMMITTED
  const fileMeta = await FileMetadata.findById(targetFileId);
  if (!fileMeta || fileMeta.publicationState !== 'COMMITTED') {
    logger.warn(`[InvoiceReconciliation] Point 1 check failed: FileMetadata ${targetFileId} is not in COMMITTED state.`);
    return { reconciled: false, reason: 'FileMetadata not in COMMITTED state' };
  }

  // Check 2: Payment-to-File linkage and entity binding
  if (!payment.fileId || payment.fileId.toString() !== targetFileId.toString()) {
    logger.warn(`[InvoiceReconciliation] Point 2 check failed: Payment.fileId linkage mismatch.`);
    return { reconciled: false, reason: 'Payment.fileId linkage does not match FileMetadata' };
  }

  if (fileMeta.relatedEntity && fileMeta.relatedEntity.toString() !== paymentId.toString()) {
    logger.warn(`[InvoiceReconciliation] Point 2 check failed: FileMetadata relatedEntity does not match payment ${paymentId}`);
    return { reconciled: false, reason: 'FileMetadata relatedEntity mismatch' };
  }

  // Check 3: Expected Object Key and Version Matching
  const expectedKey = payment.sideEffects?.invoice?.key;
  if (expectedKey && fileMeta.key !== expectedKey) {
    logger.warn(`[InvoiceReconciliation] Point 3 check failed: Stored key ${fileMeta.key} does not match expected key ${expectedKey}`);
    return { reconciled: false, reason: 'Object key mismatch against expected invoice key' };
  }

  const expectedVersion = payment.sideEffects?.invoice?.leaseVersion || 1;
  if (fileMeta.leaseVersion !== undefined && fileMeta.leaseVersion !== expectedVersion) {
    logger.warn(`[InvoiceReconciliation] Point 3 check failed: FileMetadata leaseVersion ${fileMeta.leaseVersion} does not match expected ${expectedVersion}`);
    return { reconciled: false, reason: 'Invoice lease version mismatch' };
  }

  // Check 4: Physical storage presence and checksum integrity
  let storageValid = false;
  let storageFailureReason = 'Physical storage object missing or unreachable';

  if (typeof storageCheckFn === 'function') {
    const checkResult = await storageCheckFn(fileMeta.key);
    if (typeof checkResult === 'boolean') {
      storageValid = checkResult;
    } else if (checkResult && typeof checkResult === 'object') {
      if (!checkResult.exists) {
        storageValid = false;
        storageFailureReason = 'Storage object does not exist';
      } else if (fileMeta.sha256 && checkResult.sha256 && checkResult.sha256 !== fileMeta.sha256) {
        storageValid = false;
        storageFailureReason = `Checksum mismatch: expected ${fileMeta.sha256}, got ${checkResult.sha256}`;
      } else if (checkResult.size !== undefined && checkResult.size <= 0) {
        storageValid = false;
        storageFailureReason = 'Storage object size is empty or invalid';
      } else {
        storageValid = true;
      }
    }
  } else {
    // Default storage check: inspect MongoDB FileStorage
    const cleanName = fileMeta.key ? fileMeta.key.split('/').pop() : fileMeta.filename;
    const dbStorage = await FileStorage.findOne({ filename: cleanName });
    if (dbStorage && dbStorage.data) {
      storageValid = true;
      // If sha256 was stored, verify content hash
      if (fileMeta.sha256) {
        const hash = crypto.createHash('sha256').update(dbStorage.data).digest('hex');
        if (hash !== fileMeta.sha256) {
          storageValid = false;
          storageFailureReason = `Database storage content hash mismatch against ${fileMeta.sha256}`;
        }
      }
    } else if (fileMeta.url) {
      storageValid = true;
    }
  }

  if (!storageValid) {
    logger.error(`[InvoiceReconciliation] Storage integrity check failed: ${storageFailureReason}`);
    return { reconciled: false, reason: storageFailureReason };
  }

  // All points verified! Safely resolve quarantine to COMMITTED
  payment.sideEffects.invoice.status = 'COMMITTED';
  payment.sideEffects.invoice.updatedAt = new Date();
  payment.sideEffects.invoice.lastError = null;
  payment.invoiceUrl = `/api/files/download/${fileMeta._id}`;
  await payment.save();

  logger.info(`[InvoiceReconciliation] Successfully reconciled quarantined invoice for Payment ${paymentId}`);
  return {
    reconciled: true,
    fileId: fileMeta._id,
    invoiceUrl: payment.invoiceUrl,
  };
}
