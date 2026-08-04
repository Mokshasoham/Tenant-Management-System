import mongoose from 'mongoose';

/**
 * MaintenanceNotificationMapper
 * Converts historical Maintenance records into Notification payload objects.
 */
export class MaintenanceNotificationMapper {
  static async map(maintenance, options = {}) {
    if (!maintenance) return null;

    let recipientId = null;
    const Tenant = mongoose.model('Tenant');
    const User = mongoose.model('User');

    if (maintenance.tenant) {
      if (typeof maintenance.tenant === 'object' && maintenance.tenant.email) {
        const user = await User.findOne({ email: maintenance.tenant.email });
        if (user) recipientId = user._id;
      } else if (mongoose.Types.ObjectId.isValid(maintenance.tenant)) {
        const tenantDoc = await Tenant.findById(maintenance.tenant);
        if (tenantDoc && tenantDoc.email) {
          const user = await User.findOne({ email: tenantDoc.email });
          if (user) recipientId = user._id;
        } else {
          const directUser = await User.findById(maintenance.tenant);
          if (directUser) recipientId = directUser._id;
        }
      }
    }

    if (!recipientId && maintenance.createdBy) {
      recipientId = maintenance.createdBy;
    }

    if (!recipientId) {
      return { missingRecipient: true, origin: 'maintenance', id: maintenance._id };
    }

    const createdAt = maintenance.createdAt || new Date();
    const createdAtISO = new Date(createdAt).toISOString();
    const eventType = 'maintenance.created';
    const aggregateId = maintenance._id.toString();
    const idempotencyKey = `notification-backfill:maintenance:${aggregateId}:${eventType}:${createdAtISO}`;

    return {
      payload: {
        recipient: recipientId,
        type: 'maintenance',
        category: 'maintenance',
        title: 'Maintenance Request Created',
        message: `Maintenance issue "${maintenance.issue || maintenance.title || 'Service Request'}" has been created. Status: ${maintenance.status || 'open'}.`,
        priority: maintenance.priority || 'medium',
        severity: maintenance.priority === 'critical' ? 'critical' : 'information',
        source: 'BACKFILL_MIGRATION',
        sourceModule: 'maintenance',
        entityType: 'Maintenance',
        entityId: maintenance._id,
        actionUrl: `/maintenance`,
        redirectUrl: `/maintenance`,
        eventId: `EVT-BF-MNT-${aggregateId.slice(-6).toUpperCase()}`,
        idempotencyKey,
        createdAt,
        metadata: {
          backfilled: true,
          migratedAt: new Date(),
          migrationVersion: 1,
          origin: 'maintenance',
          maintenanceId: maintenance._id.toString(),
          status: maintenance.status,
          issue: maintenance.issue || maintenance.title
        }
      }
    };
  }
}

export default MaintenanceNotificationMapper;
