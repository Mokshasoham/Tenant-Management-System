/**
 * server/src/modules/reminders/scheduler/ReminderScheduler.js
 *
 * Periodic Reminder Milestone Scanner.
 * Extends the existing platform `Scheduler` base class (server/src/platform/scheduler/Scheduler.js).
 * Reuses platform scheduler registry & tracing (`executionId`, `batchId`).
 */

import { Scheduler } from '../../../platform/scheduler/Scheduler.js';
import ReminderRule from '../models/ReminderRule.js';
import ReminderRuleEngine from '../rules/ReminderRuleEngine.js';
import Lease from '../../../models/Lease.js';
import Payment from '../../../models/Payment.js';
import logger from '../../../platform/logging/logger.js';

const DEFAULT_CRON = '0 7 * * *'; // Runs daily at 7 AM

export class ReminderScheduler extends Scheduler {
  constructor(options = {}) {
    const cronExpr = options.cron
      || process.env.SCHEDULER_REMINDER_CRON
      || DEFAULT_CRON;

    super({
      name: 'reminder-scheduler',
      cron: options.tickMs ? undefined : cronExpr,
      ...options
    });
  }

  /**
   * Main milestone evaluation loop.
   *
   * @param {object} metrics - Scheduler counters object ({ processed, skipped, failed })
   * @param {object} tracingCtx - Tracing context ({ executionId, batchId, schedulerName })
   */
  async _process(metrics, tracingCtx = {}) {
    const now = new Date();

    // 1. Fetch all enabled rules
    const activeRules = await ReminderRule.find({ isEnabled: true }).lean();
    if (activeRules.length === 0) {
      logger.info('[ReminderScheduler] No active reminder rules found.');
      return;
    }

    // 2. Process Renewal & Lease Expiry Rules
    const renewalRules = activeRules.filter(r => r.category === 'renewal' || r.category === 'lease');
    if (renewalRules.length > 0) {
      // Find active leases expiring within 60 days
      const maxLookaheadDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const activeLeases = await Lease.find({
        status: 'active',
        endDate: { $gte: now, $lte: maxLookaheadDate }
      })
        .select('_id tenant endDate property')
        .lean();

      metrics.processed += activeLeases.length;

      for (const lease of activeLeases) {
        if (!lease.tenant) {
          metrics.skipped++;
          continue;
        }

        for (const rule of renewalRules) {
          try {
            await ReminderRuleEngine.evaluateAndEnqueue({
              rule,
              entityType: 'Lease',
              entityId: lease._id,
              recipientId: lease.tenant,
              targetDate: lease.endDate,
              payload: {
                leaseId: lease._id.toString(),
                endDate: lease.endDate?.toISOString()?.split('T')[0]
              }
            });
          } catch (err) {
            metrics.failed++;
            logger.error(`[ReminderScheduler] Error evaluating rule ${rule.ruleId} for lease ${lease._id}:`, err.message);
          }
        }
      }
    }

    // 3. Process Pending Payment Due Rules
    const paymentRules = activeRules.filter(r => r.category === 'payment');
    if (paymentRules.length > 0) {
      const paymentLookaheadDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const pendingPayments = await Payment.find({
        status: 'pending',
        dueDate: { $gte: now, $lte: paymentLookaheadDate }
      })
        .select('_id user amount dueDate property')
        .lean();

      metrics.processed += pendingPayments.length;

      for (const payment of pendingPayments) {
        if (!payment.user) {
          metrics.skipped++;
          continue;
        }

        for (const rule of paymentRules) {
          try {
            await ReminderRuleEngine.evaluateAndEnqueue({
              rule,
              entityType: 'Payment',
              entityId: payment._id,
              recipientId: payment.user,
              targetDate: payment.dueDate,
              payload: {
                paymentId: payment._id.toString(),
                amount: payment.amount,
                dueDate: payment.dueDate?.toISOString()?.split('T')[0]
              }
            });
          } catch (err) {
            metrics.failed++;
            logger.error(`[ReminderScheduler] Error evaluating rule ${rule.ruleId} for payment ${payment._id}:`, err.message);
          }
        }
      }
    }

    logger.info(`[ReminderScheduler] Milestone scan completed. Candidates processed: ${metrics.processed}, Skipped: ${metrics.skipped}, Failures: ${metrics.failed}`);
  }
}

const reminderSchedulerSingleton = new ReminderScheduler();
export default reminderSchedulerSingleton;
