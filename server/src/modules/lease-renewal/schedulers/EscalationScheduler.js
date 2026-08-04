/**
 * src/modules/lease-renewal/schedulers/EscalationScheduler.js
 *
 * Evaluates SLA proximity for active campaigns:
 *   within_sla         -> approaching_breach  (within SLA_WARNING_HOURS of slaLimitDate)
 *   approaching_breach -> breached            (slaLimitDate has passed)
 *   breached + active  -> ESCALATED           (after SLA_ESCALATION_GRACE_HOURS of breach)
 */

import { Scheduler } from '../../../platform/scheduler/Scheduler.js';
import LeaseRenewalCampaign from '../../../models/LeaseRenewalCampaign.js';
import { RenewalCampaignStatus } from '../campaignConstants.js';
import { transitionStatus } from '../campaignService.js';
import { writeOutboxEvent } from '../../../platform/events/outboxService.js';
import { logRenewalAudit } from '../../../platform/audit/auditService.js';
import { createSystemPrincipal } from '../../../platform/auth/systemPrincipal.js';
import logger from '../../../platform/logging/logger.js';

const DEFAULT_CRON = '0 8 * * *';
const DEFAULT_SLA_WARNING_HOURS = 24;
const DEFAULT_ESCALATION_GRACE_HOURS = 4;

// Statuses eligible for SLA evaluation
const SLA_ELIGIBLE_STATUSES = [
  RenewalCampaignStatus.WAITING_FOR_TENANT,
  RenewalCampaignStatus.WAITING_FOR_MANAGER,
  RenewalCampaignStatus.NEGOTIATING,
  RenewalCampaignStatus.PENDING_SIGNATURE
];

export class EscalationScheduler extends Scheduler {
  constructor(options = {}) {
    const cronExpr = options.cron
      || process.env.SCHEDULER_ESCALATION_CRON
      || DEFAULT_CRON;

    if (!options.cron && !options.tickMs && !process.env.SCHEDULER_ESCALATION_CRON) {
      logger.info(`[EscalationScheduler] Using default cron expression: "${DEFAULT_CRON}"`);
    }

    super({
      name: 'escalation',
      cron: options.tickMs ? undefined : cronExpr,
      ...options
    });

    this.slaWarningHours = parseInt(
      process.env.SCHEDULER_SLA_WARNING_HOURS || String(DEFAULT_SLA_WARNING_HOURS),
      10
    );
    this.escalationGraceHours = parseInt(
      process.env.SCHEDULER_SLA_ESCALATION_GRACE_HOURS || String(DEFAULT_ESCALATION_GRACE_HOURS),
      10
    );
  }

  /**
   * SLA Evaluation and Escalation loop.
   *
   * @param {object} metrics       - Extended counters object
   * @param {object} tracingCtx    - Tracing context ({ executionId, batchId, schedulerName })
   */
  async _process(metrics, tracingCtx = {}) {
    const now = new Date();
    const warningThreshold = new Date(now.getTime() + this.slaWarningHours * 60 * 60 * 1000);
    const escalationThreshold = new Date(now.getTime() - this.escalationGraceHours * 60 * 60 * 1000);

    const activeCampaigns = await LeaseRenewalCampaign.find({
      status: { $in: SLA_ELIGIBLE_STATUSES },
      isDeleted: false
    }).select('_id campaignNumber status slaLimitDate slaStatus version').lean();

    metrics.processed = activeCampaigns.length;

    if (activeCampaigns.length === 0) {
      logger.info('[EscalationScheduler] No active SLA-eligible campaigns found.');
      return;
    }

    const actor = createSystemPrincipal({
      source: 'scheduler',
      requestId: tracingCtx.executionId,
      correlationId: tracingCtx.batchId
    });

    for (const campaign of activeCampaigns) {
      if (!campaign.slaLimitDate) {
        metrics.skipped++;
        continue;
      }

      const slaDate = new Date(campaign.slaLimitDate);
      const auditCtx = {
        scheduler: this.name,
        executionId: tracingCtx.executionId,
        batchId: tracingCtx.batchId
      };

      try {
        if (slaDate < escalationThreshold && campaign.status !== RenewalCampaignStatus.ESCALATED) {
          // Escalate campaign state machine
          await transitionStatus(campaign._id, RenewalCampaignStatus.ESCALATED, actor, {
            reason: 'SLA_BREACH_GRACE_EXPIRED',
            ...auditCtx
          });
          metrics.escalated = (metrics.escalated || 0) + 1;
          metrics.updated = (metrics.updated || 0) + 1;

        } else if (slaDate < now && campaign.slaStatus !== 'breached') {
          // Mark SLA Status as breached
          const updated = await LeaseRenewalCampaign.findOneAndUpdate(
            { _id: campaign._id, slaStatus: { $ne: 'breached' } },
            { $set: { slaStatus: 'breached', lastActivityAt: new Date() }, $inc: { 'metrics.slaBreaches': 1, version: 1 } },
            { new: true }
          );

          if (updated) {
            metrics.updated = (metrics.updated || 0) + 1;

            await logRenewalAudit({
              leaseRenewalId: campaign._id,
              userId: actor.id,
              action: 'SLA_STATUS_UPDATE',
              oldValue: { slaStatus: campaign.slaStatus },
              newValue: { slaStatus: 'breached' },
              reason: 'SLA_BREACHED',
              ...auditCtx
            });

            await writeOutboxEvent({
              eventType: 'lease.renewal.sla.breached',
              aggregateType: 'LeaseRenewalCampaign',
              aggregateId: campaign._id,
              actor,
              payload: {
                campaignId: campaign._id,
                campaignNumber: campaign.campaignNumber,
                slaLimitDate: campaign.slaLimitDate,
                slaStatus: 'breached'
              }
            });
          }

        } else if (slaDate <= warningThreshold && slaDate >= now && campaign.slaStatus === 'within_sla') {
          // Mark SLA Status as approaching breach
          const updated = await LeaseRenewalCampaign.findOneAndUpdate(
            { _id: campaign._id, slaStatus: 'within_sla' },
            { $set: { slaStatus: 'approaching_breach', lastActivityAt: new Date() }, $inc: { version: 1 } },
            { new: true }
          );

          if (updated) {
            metrics.updated = (metrics.updated || 0) + 1;

            await logRenewalAudit({
              leaseRenewalId: campaign._id,
              userId: actor.id,
              action: 'SLA_STATUS_UPDATE',
              oldValue: { slaStatus: 'within_sla' },
              newValue: { slaStatus: 'approaching_breach' },
              reason: 'SLA_APPROACHING_BREACH',
              ...auditCtx
            });
          }
        }
      } catch (err) {
        const isPermanent = err.message.includes('Invalid campaign state') || err.message.includes('not found');
        if (isPermanent) {
          metrics.permanentFailures = (metrics.permanentFailures || 0) + 1;
          metrics.skipped++;
          logger.warn(`[EscalationScheduler] Permanent skip for campaign ${campaign._id}: ${err.message}`);
        } else {
          metrics.retryableFailures = (metrics.retryableFailures || 0) + 1;
          logger.error(`[EscalationScheduler] Transient error processing SLA for campaign ${campaign._id}:`, err.message);
        }
      }
    }

    logger.info('[EscalationScheduler] Execution complete.', {
      executionId: tracingCtx.executionId,
      batchId: tracingCtx.batchId,
      processed: metrics.processed,
      escalated: metrics.escalated,
      updated: metrics.updated,
      skipped: metrics.skipped,
      retryableFailures: metrics.retryableFailures,
      permanentFailures: metrics.permanentFailures
    });
  }
}
