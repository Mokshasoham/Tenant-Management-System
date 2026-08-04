import Notification from '../../../models/Notification.js';
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
        const notification = await Notification.create({
          recipient: data.recipient,
          type: data.type || 'lease_renewal',
          category: data.category || 'renewal',
          title: data.title,
          message: data.message,
          priority: data.priority || 'medium',
          source: data.source || 'SYSTEM',
          entityType: data.entityType || 'LeaseRenewalCampaign',
          entityId: data.entityId || payload.campaignId,
          actionUrl: data.actionUrl || (payload.campaignId ? `/lease-renewals/campaigns/${payload.campaignId}` : undefined),
          redirectUrl: data.actionUrl || (payload.campaignId ? `/lease-renewals/campaigns/${payload.campaignId}` : undefined),
          metadata: data.metadata || payload
        });
        created.push(notification);
      }

      logger.info(`[NotificationEventRegistry] Created ${created.length} notification(s) for event "${eventType}".`);
      return created;
    } catch (err) {
      logger.error(`[NotificationEventRegistry] Error handling event "${eventType}":`, err.message);
      return null;
    }
  }

  _registerDefaultHandlers() {
    // 1. Campaign Created
    this.register('lease.renewal.campaign.created', async (event) => {
      const { payload = {} } = event;
      if (!payload.manager) return null;
      return {
        recipient: payload.manager,
        title: 'New Renewal Campaign Created',
        message: `Campaign ${payload.campaignNumber || ''} has been created for lease renewal.`,
        priority: 'medium',
        source: 'CAMPAIGN_AUTOMATION'
      };
    });

    // 2. SLA Warning
    this.register('lease.renewal.sla.warning', async (event) => {
      const { payload = {} } = event;
      if (!payload.manager) return null;
      return {
        recipient: payload.manager,
        title: 'SLA Warning: Campaign Approaching Breach',
        message: `Campaign ${payload.campaignNumber || ''} is approaching its SLA expiration limit.`,
        priority: 'high',
        source: 'ESCALATION_SCHEDULER'
      };
    });

    // 3. SLA Breached
    this.register('lease.renewal.sla.breached', async (event) => {
      const { payload = {} } = event;
      if (!payload.manager) return null;
      return {
        recipient: payload.manager,
        title: 'CRITICAL: SLA Breached & Escalated',
        message: `Campaign ${payload.campaignNumber || ''} breached SLA and has been escalated to senior management.`,
        priority: 'critical',
        source: 'ESCALATION_SCHEDULER'
      };
    });

    // 4. Campaign Expired
    this.register('lease.renewal.campaign.expired', async (event) => {
      const { payload = {} } = event;
      if (!payload.manager) return null;
      return {
        recipient: payload.manager,
        title: 'Campaign Expired',
        message: `Renewal campaign ${payload.campaignNumber || ''} has expired without tenant signature.`,
        priority: 'high',
        source: 'EXPIRATION_SCHEDULER'
      };
    });

    // 5. Campaign Escalated
    this.register('lease.renewal.campaign.escalated', async (event) => {
      const { payload = {} } = event;
      if (!payload.manager) return null;
      return {
        recipient: payload.manager,
        title: 'Campaign Escalated',
        message: `Campaign ${payload.campaignNumber || ''} has been escalated for manager review.`,
        priority: 'critical',
        source: 'ESCALATION_SCHEDULER'
      };
    });

    // 6. Campaign Completed
    this.register('lease.renewal.completed', async (event) => {
      const { payload = {} } = event;
      const notifications = [];
      if (payload.manager) {
        notifications.push({
          recipient: payload.manager,
          title: 'Lease Renewal Completed',
          message: `Lease renewal campaign ${payload.campaignNumber || ''} successfully completed!`,
          priority: 'medium',
          source: 'CAMPAIGN_WORKFLOW'
        });
      }
      if (payload.tenant) {
        notifications.push({
          recipient: payload.tenant,
          title: 'Lease Renewal Agreement Signed',
          message: `Your new lease agreement for campaign ${payload.campaignNumber || ''} is now active.`,
          priority: 'medium',
          source: 'CAMPAIGN_WORKFLOW'
        });
      }
      return notifications;
    });

    // 7. Reminder Created
    this.register('lease.renewal.reminder.created', async (event) => {
      const { payload = {} } = event;
      if (!payload.recipient) return null;
      return {
        recipient: payload.recipient,
        title: 'Lease Renewal Reminder',
        message: payload.message || `Reminder regarding lease renewal campaign ${payload.campaignNumber || ''}.`,
        priority: 'medium',
        source: 'REMINDER_SCHEDULER'
      };
    });
  }
}

export const notificationEventRegistry = new NotificationEventRegistry();

/** Subscribe notificationEventRegistry to EventBus events */
export const subscribeNotificationListeners = () => {
  const events = [
    'lease.renewal.campaign.created',
    'lease.renewal.sla.warning',
    'lease.renewal.sla.breached',
    'lease.renewal.campaign.expired',
    'lease.renewal.campaign.escalated',
    'lease.renewal.completed',
    'lease.renewal.reminder.created'
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
