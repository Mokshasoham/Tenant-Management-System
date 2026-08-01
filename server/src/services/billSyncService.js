import Bill from '../models/Bill.js';
import Payment from '../models/Payment.js';
import Tenant from '../models/Tenant.js';
import Property from '../models/Property.js';
import Lease from '../models/Lease.js';
import logger from '../utils/logger.js';
import { generateInvoicePDF, buildInvoiceViewModel } from './pdfService.js';

/**
 * Idempotent coordinator that recalculates amountPaid and status on the linked Bill
 * whenever a Payment document's state is modified.
 */
export const syncPaymentToBill = async (paymentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment || !payment.bill) return;

  const bill = await Bill.findById(payment.bill);
  if (!bill) return;

  // Recompute total amount paid from all fully-paid payments linked to this bill
  const payments = await Payment.find({ bill: bill._id, status: 'paid' });
  const totalPaid = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

  const previousStatus = bill.status;
  const previousAmountPaid = bill.amountPaid;
  bill.amountPaid = totalPaid;
  const balance = bill.amountDue - totalPaid;

  if (balance <= 0) {
    bill.status = 'paid';
  } else if (totalPaid > 0) {
    bill.status = 'partially_paid';
  }

  // Record to timeline only if amountPaid actually changed (prevents duplicate logs on redundant sync calls)
  if (totalPaid !== previousAmountPaid) {
    bill.timeline.push({
      status: bill.status,
      note: `Payment of ₹${payment.amountPaid} processed. Method: ${payment.paymentMethod || 'online'}. Transaction ref: ${payment.reference || 'N/A'}`
    });
  }

  // Save the bill
  await bill.save();
  logger.info(`[BillSync] Synced bill ${bill.billNumber} to amountPaid: ${totalPaid}`);

  // Re-generate updated invoice PDF if the bill just became paid
  const justBecamePaid = bill.status === 'paid' && previousStatus !== 'paid';
  if (justBecamePaid) {
    const [tenant, property, lease] = await Promise.all([
      Tenant.findById(bill.tenant),
      Property.findById(bill.property),
      Lease.findById(bill.lease),
    ]);
    const viewModel = buildInvoiceViewModel(bill, payment);
    const pdfData = await generateInvoicePDF(viewModel, tenant, property, lease);

    bill.invoiceUrl = pdfData.Location;
    bill.fileId = pdfData.fileId;
    await bill.save();

    payment.invoiceUrl = pdfData.Location;
    payment.fileId = pdfData.fileId;
    await payment.save();
  }
};
