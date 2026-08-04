/**
 * src/modules/lease-renewal/schedulers/CampaignExpirationScheduler.js
 *
 * Identifies campaigns whose expiryDate has passed while still in an
 * active status, and transitions them to EXPIRED atomically.
 */

import { Scheduler } from '../../../platform/scheduler/Scheduler.js';
import LeaseRenewalCampaign from '../../../models/LeaseRenewalCampaign.js';
import { RenewalCampaignStatus } from '../campaignConstants.js';
import { transitionStatus } from '../campaignService.js';
import { createSystemPrincipal } from '../../../platform/auth/systemPrincipal.js';
import logger from '../../../platform/logging/logger.js';

const DEFAULT_CRON = '0 */4 * * *';

// Statuses eligible for expiration
const EXPIRABLE_STATUSES = [
  RenewalCampaignStatus.DRAFT,
  RenewalCampaignStatus.CREATED,
  RenewalCampaignStatus.WAITING_FOR_TENANT,
  RenewalCampaignStatus.WAITING_FOR_MANAGER,
  RenewalCampaignStatus.NEGOTIATING,
  RenewalCampaignStatus.PENDING_SIGNATURE
];

export class CampaignExpirationScheduler extends Scheduler {
  constructor(options = {}) {
    const cronExpr = options.cron
      || process.env.SCHEDULER_EXPIRATION_CRON
      || DEFAULT_CRON;

    if (!options.cron && !options.tickMs && !process.env.SCHEDULER_EXPIRATION_CRON) {
      logger.info(`[CampaignExpirationScheduler] Using default cron expression: "${DEFAULT_CRON}"`);
    }

    super({
      name: 'campaign-expiration',
      cron: options.tickMs ? undefined : cronExpr,
      ...options
    });
  }

  /**
   * Automation engine processing loop for campaign expiration.
   *
   * @param {object} metrics       - Extended counters object
   * @param {object} tracingCtx    - Tracing context ({ executionId, batchId, schedulerName })
   */
  async _process(metrics, tracingCtx = {}) {
    const now = new Date();

    const overdueActive = await LeaseRenewalCampaign.find({
      status: { $in: EXPIRABLE_STATUSES },
      expiryDate: { $lt: now },
      isDeleted: false
    }).select('_id campaignNumber status expiryDate').lean();

    metrics.processed = overdueActive.length;

    if (overdueActive.length === 0) {
      logger.info('[CampaignExpirationScheduler] No overdue campaigns found.');
      return;
    }

    const actor = createSystemPrincipal({
      source: 'scheduler',
      requestId: tracingCtx.executionId,
      correlationId: tracingCtx.batchId
    });

    const auditCtx = {
      reason: 'AUTOMATED_CAMPAIGN_EXPIRATION',
      scheduler: this.name,
      executionId: tracingCtx.executionId,
      batchId: tracingCtx.batchId
    };

    for (const campaign of overdueActive) {
      try {
        await transitionStatus(campaign._id, RenewalCampaignStatus.EXPIRED, actor, auditCtx);
        metrics.expired = (metrics.expired || 0) + 1;
        metrics.updated = (metrics.updated || 0) + 1;
      } catch (err) {
        const isPermanent = err.message.includes('Invalid campaign state') || err.message.includes('not found');
        if (isPermanent) {
          metrics.permanentFailures = (metrics.permanentFailures || 0) + 1;
          metrics.skipped++;
          logger.warn(`[CampaignExpirationScheduler] Permanent skip for campaign ${campaign._id}: ${err.message}`);
        } else {
          metrics.retryableFailures = (metrics.retryableFailures || 0) + 1;
          logger.error(`[CampaignExpirationScheduler] Transient error expiring campaign ${campaign._id}:`, err.message);
        }
      }
    }

    logger.info('[CampaignExpirationScheduler] Execution complete.', {
      executionId: tracingCtx.executionId,
      batchId: tracingCtx.batchId,
      processed: metrics.processed,
      expired: metrics.expired,
      skipped: metrics.skipped,
      retryableFailures: metrics.retryableFailures,
      permanentFailures: metrics.permanentFailures
    });
  }
}
