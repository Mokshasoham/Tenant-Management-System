/**
 * src/modules/lease-renewal/schedulers/CampaignCreationScheduler.js
 *
 * Finds active leases expiring within the configured look-ahead window
 * and creates renewal campaigns for those that don't already have one.
 *
 * Features:
 *   1. Transactional campaign creation via campaignService.createCampaign().
 *   2. SystemPrincipal tracing (`executionId`, `batchId`).
 *   3. Transactional Outbox Event generation (`lease.renewal.campaign.created`).
 *   4. Duplicate campaign prevention & partial batch failure resilience.
 *   5. Retry classification (permanent vs retryable failures).
 */

import { Scheduler } from '../../../platform/scheduler/Scheduler.js';
import Lease from '../../../models/Lease.js';
import { RenewalCampaignStatus, CampaignSource } from '../campaignConstants.js';
import LeaseRenewalCampaign from '../../../models/LeaseRenewalCampaign.js';
import { createCampaign } from '../campaignService.js';
import { createSystemPrincipal } from '../../../platform/auth/systemPrincipal.js';
import logger from '../../../platform/logging/logger.js';

const DEFAULT_CRON = '0 6 * * *';
const DEFAULT_LOOKAHEAD_DAYS = 60;

export class CampaignCreationScheduler extends Scheduler {
  constructor(options = {}) {
    const cronExpr = options.cron
      || process.env.SCHEDULER_CAMPAIGN_CREATION_CRON
      || DEFAULT_CRON;

    if (!options.cron && !options.tickMs && !process.env.SCHEDULER_CAMPAIGN_CREATION_CRON) {
      logger.info(`[CampaignCreationScheduler] Using default cron expression: "${DEFAULT_CRON}"`);
    }

    super({
      name: 'campaign-creation',
      cron: options.tickMs ? undefined : cronExpr,
      ...options
    });

    this.lookaheadDays = parseInt(
      process.env.SCHEDULER_CAMPAIGN_CREATION_LOOKAHEAD_DAYS || String(DEFAULT_LOOKAHEAD_DAYS),
      10
    );
  }

  /**
   * Automation engine processing loop.
   *
   * @param {object} metrics       - Extended counters object
   * @param {object} tracingCtx    - Tracing context ({ executionId, batchId, schedulerName })
   */
  async _process(metrics, tracingCtx = {}) {
    const now = new Date();
    const lookaheadDate = new Date(now.getTime() + this.lookaheadDays * 24 * 60 * 60 * 1000);

    // Find active leases expiring within lookahead window
    const candidateLeases = await Lease.find({
      status: 'active',
      endDate: { $gte: now, $lte: lookaheadDate }
    }).select('_id leaseNumber endDate').lean();

    metrics.processed = candidateLeases.length;

    if (candidateLeases.length === 0) {
      logger.info('[CampaignCreationScheduler] No candidate leases found in lookahead window.');
      return;
    }

    // Check which leases already have an active campaign (idempotency guard)
    const leaseIds = candidateLeases.map(l => l._id);
    const activeStatuses = [
      RenewalCampaignStatus.DRAFT,
      RenewalCampaignStatus.CREATED,
      RenewalCampaignStatus.WAITING_FOR_TENANT,
      RenewalCampaignStatus.WAITING_FOR_MANAGER,
      RenewalCampaignStatus.NEGOTIATING,
      RenewalCampaignStatus.PENDING_SIGNATURE,
      RenewalCampaignStatus.APPROVED,
      RenewalCampaignStatus.ESCALATED
    ];

    const existingCampaigns = await LeaseRenewalCampaign.find({
      lease: { $in: leaseIds },
      status: { $in: activeStatuses },
      isDeleted: false
    }).select('lease').lean();

    const leasesWithCampaign = new Set(existingCampaigns.map(c => c.lease.toString()));

    const eligible = candidateLeases.filter(l => !leasesWithCampaign.has(l._id.toString()));
    metrics.skipped = candidateLeases.length - eligible.length;

    if (eligible.length === 0) {
      logger.info('[CampaignCreationScheduler] All candidate leases already have active campaigns.', {
        totalCandidates: candidateLeases.length,
        skipped: metrics.skipped
      });
      return;
    }

    const actor = createSystemPrincipal({
      source: 'scheduler',
      requestId: tracingCtx.executionId,
      correlationId: tracingCtx.batchId
    });

    const auditCtx = {
      reason: 'AUTOMATED_CAMPAIGN_CREATION',
      scheduler: this.name,
      executionId: tracingCtx.executionId,
      batchId: tracingCtx.batchId
    };

    // Iterate eligible leases and call createCampaign() for each
    for (const lease of eligible) {
      try {
        await createCampaign(lease._id, CampaignSource.SCHEDULER, actor, auditCtx);
        metrics.created++;
      } catch (err) {
        const isDuplicateOrValidation = err.message.includes('already exists') || err.message.includes('not found');
        if (isDuplicateOrValidation) {
          metrics.permanentFailures = (metrics.permanentFailures || 0) + 1;
          metrics.skipped++;
          logger.warn(`[CampaignCreationScheduler] Permanent skip for lease ${lease._id}: ${err.message}`);
        } else {
          metrics.retryableFailures = (metrics.retryableFailures || 0) + 1;
          logger.error(`[CampaignCreationScheduler] Transient error processing lease ${lease._id}:`, err.message);
        }
      }
    }

    logger.info('[CampaignCreationScheduler] Execution complete.', {
      executionId: tracingCtx.executionId,
      batchId: tracingCtx.batchId,
      processed: metrics.processed,
      created: metrics.created,
      skipped: metrics.skipped,
      retryableFailures: metrics.retryableFailures,
      permanentFailures: metrics.permanentFailures
    });
  }
}
