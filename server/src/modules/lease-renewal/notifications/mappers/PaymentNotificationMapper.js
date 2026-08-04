import mongoose from 'mongoose';

/**
 * PaymentNotificationMapper
 * Converts historical Payment records into Notification payload objects.
 */
export class PaymentNotificationMapper {
  static async map(payment, options = {}) {
    if (!payment || payment.status !== 'paid') {
      return null;
    }

    // Resolve tenant user recipient ID
    let recipientId = null;
    if (payment.tenant) {
      if (typeof payment.tenant === 'object') {
        if (payment.tenant._id) {
          recipientId = payment.tenant._id;
        } else if (payment.tenant.email) {
          const User = mongoose.model('User');
          const user = await User.findOne({ email: payment.tenant.email });
          if (user) recipientId = user._id;
        }
      } else if (mongoose.Types.ObjectId.isValid(payment.tenant)) {
        recipientId = payment.tenant;
      }
    }

    if (!recipientId) {
      return { missingRecipient: true, origin: 'payment', id: payment._id };
    }

    const createdAt = payment.paymentDate || payment.createdAt || new Date();
    const createdAtISO = new Date(createdAt).toISOString();
    const eventType = 'payment.received';
    const aggregateId = payment._id.toString();
    const idempotencyKey = `notification-backfill:payment:${aggregateId}:${eventType}:${createdAtISO}`;

    const formattedAmount = Number(payment.amount || payment.amountPaid || 0).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR'
    });

    return {
      payload: {
        recipient: recipientId,
        type: 'payments',
        category: 'payments',
        title: 'Rent Payment Received',
        message: `Your payment of ${formattedAmount} (Ref: ${payment.reference || payment.razorpayPaymentId || payment._id}) was received successfully.`,
        priority: 'medium',
        severity: 'success',
        source: 'BACKFILL_MIGRATION',
        sourceModule: 'payments',
        entityType: 'Payment',
        entityId: payment._id,
        actionUrl: `/payments`,
        redirectUrl: `/payments`,
        eventId: `EVT-BF-PAY-${aggregateId.slice(-6).toUpperCase()}`,
        idempotencyKey,
        createdAt,
        metadata: {
          backfilled: true,
          migratedAt: new Date(),
          migrationVersion: 1,
          origin: 'payment',
          paymentId: payment._id.toString(),
          reference: payment.reference || payment.razorpayPaymentId,
          amount: payment.amount || payment.amountPaid,
          leaseId: payment.lease ? payment.lease.toString() : null
        }
      }
    };
  }
}

export default PaymentNotificationMapper;
