/**
 * server/src/modules/reminders/events/reminderEventSubscriber.js
 *
 * EventBus Domain Event Subscriber.
 * Listens for platform business events to automatically cancel pending reminders upon entity completion
 * and react to domain event triggers.
 */

import eventBus from '../../../platform/events/eventBus.js';
import reminderQueue from '../queue/reminderQueue.js';
import logger from '../../../platform/logging/logger.js';

export class ReminderEventSubscriber {
  constructor() {
    this.isSubscribed = false;
  }

  /**
   * Registers EventBus subscriptions.
   */
  subscribe() {
    if (this.isSubscribed) return;

    // 1. Payment Received -> Cancel pending rent due / overdue payment reminders
    eventBus.subscribe('payment.received', async (event) => {
      const { paymentId, leaseId } = event.payload || event;
      if (paymentId) {
        await reminderQueue.cancelRemindersForEntity('Payment', paymentId, 'Payment completed');
      }
      if (leaseId) {
        await reminderQueue.cancelRemindersForEntity('Lease', leaseId, 'Payment received for lease');
      }
    });

    // 2. Campaign / Renewal Completed -> Cancel pending renewal reminders
    eventBus.subscribe('lease.renewal.completed', async (event) => {
      const { campaignId, leaseId } = event.payload || event;
      if (campaignId) {
        await reminderQueue.cancelRemindersForEntity('Campaign', campaignId, 'Campaign completed');
      }
      if (leaseId) {
        await reminderQueue.cancelRemindersForEntity('Lease', leaseId, 'Lease renewal completed');
      }
    });

    eventBus.subscribe('campaign.completed', async (event) => {
      const { campaignId } = event.payload || event;
      if (campaignId) {
        await reminderQueue.cancelRemindersForEntity('Campaign', campaignId, 'Campaign completed');
      }
    });

    // 3. Maintenance Resolved -> Cancel pending maintenance reminders
    eventBus.subscribe('maintenance.resolved', async (event) => {
      const { maintenanceId } = event.payload || event;
      if (maintenanceId) {
        await reminderQueue.cancelRemindersForEntity('Maintenance', maintenanceId, 'Maintenance issue resolved');
      }
    });

    this.isSubscribed = true;
    logger.info('[ReminderEventSubscriber] Subscribed to domain completion & event triggers on EventBus.');
  }
}

const reminderEventSubscriberSingleton = new ReminderEventSubscriber();
export default reminderEventSubscriberSingleton;
