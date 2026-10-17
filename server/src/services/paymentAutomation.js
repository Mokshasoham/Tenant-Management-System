import Payment from '../models/Payment.js';
import Tenant from '../models/Tenant.js';
import Property from '../models/Property.js';
import { generateInvoicePDF } from './pdfService.js';
import { sendPaymentReceiptEmail } from './emailService.js';
import logger from '../utils/logger.js';

/**
 * Handles all post-payment activities:
 * 1. Generates a PDF invoice.
 * 2. Updates the payment record with the invoice URL.
 * 3. Sends a confirmation email to the tenant with the attachment.
 */
export const processPostPayment = async (paymentOrId) => {
    let paymentId = paymentOrId?._id || paymentOrId || 'unknown';
    try {
        const payment = paymentOrId?._id ? paymentOrId : await Payment.findById(paymentId);
        if (!payment || !['paid', 'partially_paid'].includes(payment.status)) {
            logger.warn(`Post-payment processing skipped for payment ${paymentId}: not found or status is ${payment?.status}.`);
            return;
        }

        // If invoice already exists, don't regenerate (optional, but good for idempotency)
        if (payment.invoiceUrl && process.env.NODE_ENV === 'production') {
            logger.info(`Invoice already exists for payment ${paymentId}.`);
            return;
        }

        // In offline test environment, bypass background side-effects unless explicitly requested
        if (process.env.NODE_ENV === 'test' && !paymentOrId?.executeInTest) {
            logger.info(`Post-payment automation bypassed in test environment for payment: ${paymentId}`);
            return { success: true, bypassed: true };
        }

        const tenant = await Tenant.findById(payment.tenant);
        const property = await Property.findById(payment.property);

        if (!tenant || !property) {
            logger.warn(`Missing tenant or property info for payment ${paymentId}. Automation aborted.`);
            return;
        }

        // 1. Generate Invoice PDF
        logger.info(`Generating invoice for payment: ${paymentId}`);
        const uploadResult = await generateInvoicePDF(payment, tenant, property);
        
        // 2. Commit Invoice Publication with durable quarantine protection
        const { commitInvoicePublicationAtomic } = await import('./invoicePublicationService.js');
        const commitResult = await commitInvoicePublicationAtomic({
            paymentId,
            fileId: uploadResult.fileId,
            fileKey: uploadResult.Key || uploadResult.key,
            leaseVersion: payment.sideEffects?.invoice?.leaseVersion || 1,
        });

        if (!commitResult.success) {
            logger.warn(`Invoice publication commit was not committed (outcome: ${commitResult.outcome}, quarantined: ${commitResult.quarantined}). Halting email dispatch.`);
            return {
                success: false,
                quarantined: Boolean(commitResult.quarantined),
                outcome: commitResult.outcome,
                fileId: uploadResult.fileId,
            };
        }

        // 3. Send Email
        logger.info(`Sending receipt email for payment: ${paymentId}`);
        await sendPaymentReceiptEmail(tenant, payment, property, uploadResult);

        logger.info(`Post-payment automation completed for payment: ${paymentId}`);
        return { success: true, invoiceUrl: `/api/files/download/${uploadResult.fileId}`, fileId: uploadResult.fileId };
    } catch (error) {
        logger.error(`Post-payment automation failed for payment ${paymentId}: ${error.message}`);
        // We don't throw here to avoid crashing the caller (e.g. webhook response)
        return { success: false, error: error.message };
    }
};
