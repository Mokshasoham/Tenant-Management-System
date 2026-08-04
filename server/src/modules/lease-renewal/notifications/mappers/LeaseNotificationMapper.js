import mongoose from 'mongoose';

/**
 * LeaseNotificationMapper
 * Converts historical Lease records into Notification payload objects.
 */
export class LeaseNotificationMapper {
  static async map(lease, options = {}) {
    if (!lease) return [];

    const results = [];
    const Tenant = mongoose.model('Tenant');
    const User = mongoose.model('User');

    // Resolve tenant user recipient
    let recipientId = null;
    if (lease.tenant) {
      if (typeof lease.tenant === 'object' && lease.tenant.email) {
        const user = await User.findOne({ email: lease.tenant.email });
        if (user) recipientId = user._id;
      } else if (mongoose.Types.ObjectId.isValid(lease.tenant)) {
        const tenantDoc = await Tenant.findById(lease.tenant);
        if (tenantDoc && tenantDoc.email) {
          const user = await User.findOne({ email: tenantDoc.email });
          if (user) recipientId = user._id;
        } else {
          const directUser = await User.findById(lease.tenant);
          if (directUser) recipientId = directUser._id;
        }
      }
    }

    if (!recipientId && lease.createdBy) {
      recipientId = lease.createdBy;
    }

    if (!recipientId) {
      return [{ missingRecipient: true, origin: 'lease', id: lease._id }];
    }

    const leaseNum = lease.leaseNumber || lease._id.toString();

    // 1. Lease Signed event if signedAt exists
    if (lease.signedAt || lease.signatureType) {
      const createdAt = lease.signedAt || lease.createdAt || new Date();
      const createdAtISO = new Date(createdAt).toISOString();
      const eventType = 'lease.signed';
      const aggregateId = lease._id.toString();
      const idempotencyKey = `notification-backfill:lease:${aggregateId}:${eventType}:${createdAtISO}`;

      results.push({
        payload: {
          recipient: recipientId,
          type: 'lease',
          category: 'lease',
          title: 'Lease Agreement Signed',
          message: `Lease agreement ${leaseNum} has been officially signed and recorded.`,
          priority: 'high',
          severity: 'success',
          source: 'BACKFILL_MIGRATION',
          sourceModule: 'lease-engine',
          entityType: 'Lease',
          entityId: lease._id,
          actionUrl: `/my-lease`,
          redirectUrl: `/my-lease`,
          eventId: `EVT-BF-LSE-SGN-${aggregateId.slice(-6).toUpperCase()}`,
          idempotencyKey,
          createdAt,
          metadata: {
            backfilled: true,
            migratedAt: new Date(),
            migrationVersion: 1,
            origin: 'lease',
            leaseId: lease._id.toString(),
            leaseNumber: leaseNum,
            signedBy: lease.signedBy || null
          }
        }
      });
    } else {
      // Base Lease Created / Active notification
      const createdAt = lease.createdAt || new Date();
      const createdAtISO = new Date(createdAt).toISOString();
      const eventType = 'lease.created';
      const aggregateId = lease._id.toString();
      const idempotencyKey = `notification-backfill:lease:${aggregateId}:${eventType}:${createdAtISO}`;

      results.push({
        payload: {
          recipient: recipientId,
          type: 'lease',
          category: 'lease',
          title: 'Lease Record Active',
          message: `Lease agreement ${leaseNum} is active for your property.`,
          priority: 'medium',
          severity: 'information',
          source: 'BACKFILL_MIGRATION',
          sourceModule: 'lease-engine',
          entityType: 'Lease',
          entityId: lease._id,
          actionUrl: `/my-lease`,
          redirectUrl: `/my-lease`,
          eventId: `EVT-BF-LSE-CRT-${aggregateId.slice(-6).toUpperCase()}`,
          idempotencyKey,
          createdAt,
          metadata: {
            backfilled: true,
            migratedAt: new Date(),
            migrationVersion: 1,
            origin: 'lease',
            leaseId: lease._id.toString(),
            leaseNumber: leaseNum
          }
        }
      });
    }

    // 2. Sent Reminders (if any historical reminder evidence exists in sentReminders array)
    if (Array.isArray(lease.sentReminders) && lease.sentReminders.length > 0) {
      lease.sentReminders.forEach((reminderDate, idx) => {
        const createdAt = reminderDate || lease.createdAt;
        const createdAtISO = new Date(createdAt).toISOString();
        const eventType = `lease.reminder.${idx}`;
        const aggregateId = lease._id.toString();
        const idempotencyKey = `notification-backfill:lease:${aggregateId}:${eventType}:${createdAtISO}`;

        results.push({
          payload: {
            recipient: recipientId,
            type: 'renewal',
            category: 'renewal',
            title: 'Lease Renewal Reminder',
            message: `Reminder regarding your upcoming lease renewal for lease ${leaseNum}.`,
            priority: 'medium',
            severity: 'warning',
            source: 'BACKFILL_MIGRATION',
            sourceModule: 'lease-renewal',
            entityType: 'Lease',
            entityId: lease._id,
            actionUrl: `/my-lease`,
            redirectUrl: `/my-lease`,
            eventId: `EVT-BF-LSE-REM-${aggregateId.slice(-6).toUpperCase()}-${idx}`,
            idempotencyKey,
            createdAt,
            metadata: {
              backfilled: true,
              migratedAt: new Date(),
              migrationVersion: 1,
              origin: 'lease',
              leaseId: lease._id.toString(),
              leaseNumber: leaseNum,
              reminderIndex: idx
            }
          }
        });
      });
    }

    return results;
  }
}

export default LeaseNotificationMapper;
