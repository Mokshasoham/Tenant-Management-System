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
    try {
        const paymentId = paymentOrId._id || paymentOrId;
        const payment = paymentOrId._id ? paymentOrId : await Payment.findById(paymentId);
        if (!payment || !['paid', 'partially_paid'].includes(payment.status)) {
            logger.warn(`Post-payment processing skipped for payment ${paymentId}: not found or status is ${payment?.status}.`);
            return;
        }

        // If invoice already exists, don't regenerate (optional, but good for idempotency)
        if (payment.invoiceUrl && process.env.NODE_ENV === 'production') {
            logger.info(`Invoice already exists for payment ${paymentId}.`);
            return;
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
        
        // 2. Update Payment Record
        payment.fileId = uploadResult.fileId;
        payment.invoiceUrl = `/api/files/download/${uploadResult.fileId}`;
        await payment.save();

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
