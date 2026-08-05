import NotificationService from '../../../services/NotificationService.js';
import logger from '../../../platform/logging/logger.js';
import eventBus from '../../../platform/events/eventBus.js';

/**
 * Registry mapping domain event types to notification generator handlers.
 */
class NotificationEventRegistry {
  constructor() {
    this.handlers = new Map();
    this._registerDefaultHandlers();
  }

  /**
   * Registers a notification handler for a specific domain event type.
   * 
   * @param {string} eventType 
   * @param {Function} handlerFn - Async function returning Notification payload or array of payloads
   */
  register(eventType, handlerFn) {
    if (this.handlers.has(eventType)) {
      logger.warn(`[NotificationEventRegistry] Overwriting existing handler for "${eventType}".`);
    }
    this.handlers.set(eventType, handlerFn);
  }

  /**
   * Dispatches an incoming domain event to its registered notification handler and persists the notification.
   * 
   * @param {object} domainEvent - Standard outbox / eventBus payload
   */
  async handleEvent(domainEvent) {
    const { eventType, payload = {} } = domainEvent;
    const handler = this.handlers.get(eventType);

    if (!handler) {
      return null;
    }

    try {
      const notificationData = await handler(domainEvent);
      if (!notificationData) return null;

      const records = Array.isArray(notificationData) ? notificationData : [notificationData];
      const created = [];

      for (const data of records) {
        if (!data.recipient || !data.title || !data.message) continue;

        const notification = await NotificationService.notify({
          recipient: data.recipient,
          type: data.type || 'info',
          category: data.category || 'system',
          title: data.title,
          message: data.message,
          priority: data.priority || 'medium',
          severity: data.severity || 'information',
          source: data.source || 'EVENT_BUS',
          sourceModule: data.sourceModule || 'system',
          entityType: data.entityType || payload.aggregateType || 'DomainEntity',
          entityId: data.entityId || payload.campaignId || payload.leaseId || payload.paymentId || payload.bookingId,
          actionUrl: data.actionUrl || (payload.campaignId ? `/lease-renewals/campaigns/${payload.campaignId}` : '/notifications'),
          redirectUrl: data.actionUrl || (payload.campaignId ? `/lease-renewals/campaigns/${payload.campaignId}` : '/notifications'),
          metadata: data.metadata || payload,
          idempotencyKey: data.idempotencyKey
        });

        if (notification) {
          created.push(notification);
        }
      }

      logger.info(`[NotificationEventRegistry] Created ${created.length} notification(s) for event "${eventType}".`);
      return created;
    } catch (err) {
      logger.error(`[NotificationEventRegistry] Error handling event "${eventType}":`, err.message);
      return null;
    }
  }

  _registerDefaultHandlers() {
    // 1. Campaign / Renewal Created
    const handleCampaignCreated = async (event) => {
      const { payload = {} } = event;
      if (!payload.manager && !payload.recipient) return null;
      return {
        recipient: payload.manager || payload.recipient,
        category: 'renewal',
        title: 'New Renewal Campaign Created',
        message: `Campaign ${payload.campaignNumber || ''} has been created for lease renewal.`,
        priority: 'medium',
        severity: 'information',
        sourceModule: 'lease-renewal',
        source: 'CAMPAIGN_AUTOMATION'
      };
    };
    this.register('lease.renewal.campaign.created', handleCampaignCreated);
    this.register('lease.renewal.created', handleCampaignCreated);
    this.register('campaign.created', handleCampaignCreated);

    // 2. SLA Warning
    const handleSlaWarning = async (event) => {
      const { payload = {} } = event;
      if (!payload.manager && !payload.recipient) return null;
      return {
        recipient: payload.manager || payload.recipient,
        category: 'renewal',
        title: 'SLA Warning: Campaign Approaching Breach',
        message: `Campaign ${payload.campaignNumber || ''} is approaching its SLA expiration limit.`,
        priority: 'high',
        severity: 'warning',
        sourceModule: 'lease-renewal',
        source: 'ESCALATION_SCHEDULER'
      };
    };
    this.register('lease.renewal.sla.warning', handleSlaWarning);
    this.register('sla.warning', handleSlaWarning);

    // 3. SLA Breached
    const handleSlaBreached = async (event) => {
      const { payload = {} } = event;
      if (!payload.manager && !payload.recipient) return null;
      return {
        recipient: payload.manager || payload.recipient,
        category: 'renewal',
        title: 'CRITICAL: SLA Breached & Escalated',
        message: `Campaign ${payload.campaignNumber || ''} breached SLA and has been escalated to senior management.`,
        priority: 'critical',
        severity: 'critical',
        sourceModule: 'lease-renewal',
        source: 'ESCALATION_SCHEDULER'
      };
    };
    this.register('lease.renewal.sla.breached', handleSlaBreached);
    this.register('sla.breached', handleSlaBreached);

    // 4. Campaign Expired
    this.register('lease.renewal.campaign.expired', async (event) => {
      const { payload = {} } = event;
      if (!payload.manager && !payload.recipient) return null;
      return {
        recipient: payload.manager || payload.recipient,
        category: 'renewal',
        title: 'Campaign Expired',
        message: `Renewal campaign ${payload.campaignNumber || ''} has expired without tenant signature.`,
        priority: 'high',
        severity: 'warning',
        sourceModule: 'lease-renewal',
        source: 'EXPIRATION_SCHEDULER'
      };
    });

    // 5. Campaign Escalated
    const handleEscalated = async (event) => {
      const { payload = {} } = event;
      if (!payload.manager && !payload.recipient) return null;
      return {
        recipient: payload.manager || payload.recipient,
        category: 'renewal',
        title: 'Campaign Escalated',
        message: `Campaign ${payload.campaignNumber || ''} has been escalated for manager review.`,
        priority: 'critical',
        severity: 'critical',
        sourceModule: 'lease-renewal',
        source: 'ESCALATION_SCHEDULER'
      };
    };
    this.register('lease.renewal.campaign.escalated', handleEscalated);
    this.register('campaign.escalated', handleEscalated);

    // 6. Campaign / Renewal Completed
    this.register('lease.renewal.completed', async (event) => {
      const { payload = {} } = event;
      const notifications = [];
      if (payload.manager) {
        notifications.push({
          recipient: payload.manager,
          category: 'renewal',
          title: 'Lease Renewal Completed',
          message: `Lease renewal campaign ${payload.campaignNumber || ''} successfully completed!`,
          priority: 'medium',
          severity: 'success',
          sourceModule: 'lease-renewal',
          source: 'CAMPAIGN_WORKFLOW'
        });
      }
      if (payload.tenant) {
        notifications.push({
          recipient: payload.tenant,
          category: 'lease',
          title: 'Lease Renewal Agreement Signed',
          message: `Your new lease agreement for campaign ${payload.campaignNumber || ''} is now active.`,
          priority: 'medium',
          severity: 'success',
          sourceModule: 'lease-renewal',
          source: 'CAMPAIGN_WORKFLOW'
        });
      }
      return notifications;
    });

    // 7. Reminder Created
    const handleReminder = async (event) => {
      const { payload = {} } = event;
      if (!payload.recipient) return null;
      return {
        recipient: payload.recipient,
        category: 'renewal',
        title: 'Lease Renewal Reminder',
        message: payload.message || `Reminder regarding lease renewal campaign ${payload.campaignNumber || ''}.`,
        priority: 'medium',
        severity: 'warning',
        sourceModule: 'lease-renewal',
        source: 'REMINDER_SCHEDULER'
      };
    };
    this.register('lease.renewal.reminder.created', handleReminder);
    this.register('reminder.created', handleReminder);

    // 8. Lease Created & Signed
    this.register('lease.created', async (event) => {
      const { payload = {} } = event;
      if (!payload.tenant && !payload.recipient) return null;
      return {
        recipient: payload.tenant || payload.recipient,
        category: 'lease',
        title: 'New Lease Agreement Created',
        message: `Lease ${payload.leaseNumber || ''} has been created.`,
        priority: 'medium',
        severity: 'information',
        sourceModule: 'lease-engine',
        actionUrl: `/my-lease`
      };
    });

    this.register('lease.signed', async (event) => {
      const { payload = {} } = event;
      const notifications = [];
      if (payload.tenant || payload.recipient) {
        notifications.push({
          recipient: payload.tenant || payload.recipient,
          category: 'lease',
          title: 'Lease Agreement Signed',
          message: `Lease ${payload.leaseNumber || ''} has been officially signed.`,
          priority: 'high',
          severity: 'success',
          sourceModule: 'lease-engine',
          actionUrl: `/my-lease`
        });
      }
      if (payload.manager) {
        notifications.push({
          recipient: payload.manager,
          category: 'lease',
          title: 'Lease Signed by Tenant',
          message: `Tenant has signed lease agreement ${payload.leaseNumber || ''}.`,
          priority: 'high',
          severity: 'success',
          sourceModule: 'lease-engine',
          actionUrl: `/leases`
        });
      }
      return notifications;
    });

    this.register('lease.completed', async (event) => {
      const { payload = {} } = event;
      if (!payload.tenant && !payload.recipient) return null;
      return {
        recipient: payload.tenant || payload.recipient,
        category: 'lease',
        title: 'Lease Completed',
        message: `Lease ${payload.leaseNumber || ''} is now complete.`,
        priority: 'medium',
        severity: 'success',
        sourceModule: 'lease-engine',
        actionUrl: `/my-lease`
      };
    });

    // 9. Payment Received
    this.register('payment.received', async (event) => {
      const { payload = {} } = event;
      if (!payload.tenant && !payload.recipient) return null;
      return {
        recipient: payload.tenant || payload.recipient,
        category: 'payments',
        title: 'Rent Payment Received',
        message: `Payment of ₹${payload.amount || 0} received successfully.`,
        priority: 'medium',
        severity: 'success',
        sourceModule: 'payments',
        actionUrl: `/payments`
      };
    });

    // 10. Maintenance Created
    this.register('maintenance.created', async (event) => {
      const { payload = {} } = event;
      if (!payload.recipient && !payload.manager) return null;
      return {
        recipient: payload.recipient || payload.manager,
        category: 'maintenance',
        title: 'Maintenance Request Created',
        message: `Maintenance request "${payload.issue || 'Service Issue'}" was created.`,
        priority: payload.priority || 'medium',
        severity: 'information',
        sourceModule: 'maintenance',
        actionUrl: `/maintenance`
      };
    });

    // 11. Booking Created / Approved / Cancelled
    this.register('booking.created', async (event) => {
      const { payload = {} } = event;
      if (!payload.recipient && !payload.tenant) return null;
      return {
        recipient: payload.recipient || payload.tenant,
        category: 'booking',
        title: 'Booking Request Submitted',
        message: `Your booking request for property ${payload.propertyName || ''} was submitted.`,
        priority: 'medium',
        severity: 'information',
        sourceModule: 'booking',
        actionUrl: `/bookings`
      };
    });

    this.register('booking.approved', async (event) => {
      const { payload = {} } = event;
      if (!payload.recipient && !payload.tenant) return null;
      return {
        recipient: payload.recipient || payload.tenant,
        category: 'booking',
        title: 'Booking Approved!',
        message: `Your booking request for property ${payload.propertyName || ''} has been approved.`,
        priority: 'high',
        severity: 'success',
        sourceModule: 'booking',
        actionUrl: `/bookings`
      };
    });

    this.register('booking.cancelled', async (event) => {
      const { payload = {} } = event;
      if (!payload.recipient && !payload.tenant) return null;
      return {
        recipient: payload.recipient || payload.tenant,
        category: 'booking',
        title: 'Booking Cancelled',
        message: `Your booking request for property ${payload.propertyName || ''} has been cancelled.`,
        priority: 'high',
        severity: 'warning',
        sourceModule: 'booking',
        actionUrl: `/bookings`
      };
    });
  }
}

export const notificationEventRegistry = new NotificationEventRegistry();

/** Subscribe notificationEventRegistry to EventBus events */
export const subscribeNotificationListeners = () => {
  const events = [
    'lease.created',
    'lease.signed',
    'lease.completed',
    'lease.renewal.campaign.created',
    'lease.renewal.created',
    'campaign.created',
    'lease.renewal.sla.warning',
    'sla.warning',
    'lease.renewal.sla.breached',
    'sla.breached',
    'lease.renewal.campaign.expired',
    'lease.renewal.campaign.escalated',
    'campaign.escalated',
    'lease.renewal.completed',
    'lease.renewal.reminder.created',
    'reminder.created',
    'payment.received',
    'maintenance.created',
    'booking.created',
    'booking.approved',
    'booking.cancelled'
  ];

  for (const eventName of events) {
    eventBus.subscribe(eventName, async (eventPayload) => {
      await notificationEventRegistry.handleEvent({
        eventType: eventName,
        payload: eventPayload
      });
    });
  }
};

export default notificationEventRegistry;
