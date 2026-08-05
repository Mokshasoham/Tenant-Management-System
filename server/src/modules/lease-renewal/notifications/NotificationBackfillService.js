import mongoose from 'mongoose';
import Notification from '../../../models/Notification.js';
import PaymentNotificationMapper from './mappers/PaymentNotificationMapper.js';
import LeaseNotificationMapper from './mappers/LeaseNotificationMapper.js';
import MaintenanceNotificationMapper from './mappers/MaintenanceNotificationMapper.js';
import CampaignNotificationMapper from './mappers/CampaignNotificationMapper.js';

/**
 * NotificationBackfillService
 * Service for backfilling historical business events and domain records into Notification documents.
 * Supports priority sourcing, dry-run simulation, batch processing, per-entity reporting, and deterministic idempotency.
 */
export class NotificationBackfillService {
  /**
   * Main entry point to run the backfill migration.
   * 
   * @param {Object} options
   * @param {boolean} options.dryRun - If true, simulates migration without DB writes
   * @param {number} options.batchSize - Batch size for processing records (default: 500)
   * @param {Object} options.logger - Custom logger interface (defaults to console)
   * @returns {Promise<Object>} Final verification report
   */
  static async run(options = {}) {
    const { dryRun = false, batchSize = 500, logger = console } = options;
    const startTime = Date.now();

    logger.info(`[NotificationBackfillService] Starting migration... (dryRun: ${dryRun}, batchSize: ${batchSize})`);

    const stats = {
      dryRun,
      audits: { processed: 0, created: 0, skipped: 0, missingRecipients: 0 },
      outbox: { processed: 0, created: 0, skipped: 0, missingRecipients: 0 },
      payments: { processed: 0, created: 0, skipped: 0, missingRecipients: 0 },
      leases: { processed: 0, created: 0, skipped: 0, missingRecipients: 0 },
      maintenance: { processed: 0, created: 0, skipped: 0, missingRecipients: 0 },
      campaigns: { processed: 0, created: 0, skipped: 0, missingRecipients: 0 },
      totalScanned: 0,
      totalCreated: 0,
      totalSkipped: 0,
      totalMissingRecipients: 0,
      unknownEventTypes: 0,
      errors: 0,
      elapsedMs: 0
    };

    try {
      // Ensure Mongoose schema indexes (including unique idempotencyKey index) are created when connected
      if (mongoose.connection?.readyState === 1 && Notification.init) {
        await Notification.init();
      }
      // 1. Process LeaseRenewalAudit (Primary Source) if registered
      if (mongoose.models.LeaseRenewalAudit) {
        await this._processAudits(stats, { dryRun, batchSize, logger });
      }

      // 2. Process OutboxEvent (Fallback Source 1) if registered
      if (mongoose.models.OutboxEvent) {
        await this._processOutbox(stats, { dryRun, batchSize, logger });
      }

      // 3. Process Payments
      if (mongoose.models.Payment) {
        await this._processEntity(
          mongoose.models.Payment,
          PaymentNotificationMapper,
          stats.payments,
          stats,
          { dryRun, batchSize, logger, origin: 'payment' }
        );
      }

      // 4. Process Leases
      if (mongoose.models.Lease) {
        await this._processEntity(
          mongoose.models.Lease,
          LeaseNotificationMapper,
          stats.leases,
          stats,
          { dryRun, batchSize, logger, origin: 'lease' }
        );
      }

      // 5. Process Maintenance
      if (mongoose.models.Maintenance) {
        await this._processEntity(
          mongoose.models.Maintenance,
          MaintenanceNotificationMapper,
          stats.maintenance,
          stats,
          { dryRun, batchSize, logger, origin: 'maintenance' }
        );
      }

      // 6. Process LeaseRenewalCampaigns
      if (mongoose.models.LeaseRenewalCampaign) {
        await this._processEntity(
          mongoose.models.LeaseRenewalCampaign,
          CampaignNotificationMapper,
          stats.campaigns,
          stats,
          { dryRun, batchSize, logger, origin: 'campaign' }
        );
      }

    } catch (err) {
      logger.error('[NotificationBackfillService] Error during backfill:', err);
      stats.errors++;
    } finally {
      stats.elapsedMs = Date.now() - startTime;
      logger.info(`[NotificationBackfillService] Migration complete in ${stats.elapsedMs}ms.`);
    }

    return stats;
  }

  /**
   * Helper to process a given Mongoose model with a mapper class in batches.
   */
  static async _processEntity(Model, MapperClass, entityStats, totalStats, { dryRun, batchSize, logger, origin }) {
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const records = await Model.find({}).sort({ createdAt: 1 }).skip(skip).limit(batchSize);
      if (!records || records.length === 0) {
        hasMore = false;
        break;
      }

      entityStats.processed += records.length;
      totalStats.totalScanned += records.length;

      for (const record of records) {
        try {
          const mapResult = await MapperClass.map(record);
          if (!mapResult) continue;

          const items = Array.isArray(mapResult) ? mapResult : [mapResult];
          for (const item of items) {
            if (item.missingRecipient) {
              entityStats.missingRecipients++;
              totalStats.totalMissingRecipients++;
              continue;
            }

            if (item.payload) {
              const saved = await this._saveNotification(item.payload, dryRun);
              if (saved) {
                entityStats.created++;
                totalStats.totalCreated++;
              } else {
                entityStats.skipped++;
                totalStats.totalSkipped++;
              }
            }
          }
        } catch (itemErr) {
          logger.error(`Error processing ${origin} record ${record._id}:`, itemErr.message);
          totalStats.errors++;
        }
      }

      skip += records.length;
      if (records.length < batchSize) {
        hasMore = false;
      }
    }
  }

  /**
   * Helper for processing LeaseRenewalAudit records if any exist.
   */
  static async _processAudits(totalStats, { dryRun, batchSize, logger }) {
    const LeaseRenewalAudit = mongoose.models.LeaseRenewalAudit;
    if (!LeaseRenewalAudit) return;

    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const audits = await LeaseRenewalAudit.find({}).sort({ timestamp: 1 }).skip(skip).limit(batchSize);
      if (!audits || audits.length === 0) break;

      totalStats.audits.processed += audits.length;
      totalStats.totalScanned += audits.length;

      for (const audit of audits) {
        if (!audit.userId) {
          totalStats.audits.missingRecipients++;
          totalStats.totalMissingRecipients++;
          continue;
        }

        const createdAt = audit.timestamp || audit.createdAt || new Date();
        const createdAtISO = new Date(createdAt).toISOString();
        const eventType = (audit.action || 'generic_audit').toLowerCase();
        const idempotencyKey = `notification-backfill:audit:${audit._id}:${eventType}:${createdAtISO}`;

        const payload = {
          recipient: audit.userId,
          type: 'lease',
          category: 'lease',
          title: `Audit Action: ${audit.action}`,
          message: `Audit log record for action "${audit.action}".`,
          priority: 'medium',
          severity: 'information',
          source: 'BACKFILL_MIGRATION',
          sourceModule: 'audit',
          entityType: 'LeaseRenewalAudit',
          entityId: audit.leaseRenewalId,
          actionUrl: `/leases`,
          eventId: `EVT-BF-AUD-${audit._id.toString().slice(-6).toUpperCase()}`,
          idempotencyKey,
          createdAt,
          metadata: {
            backfilled: true,
            migratedAt: new Date(),
            migrationVersion: 1,
            origin: 'audit',
            auditId: audit._id.toString()
          }
        };

        const saved = await this._saveNotification(payload, dryRun);
        if (saved) {
          totalStats.audits.created++;
          totalStats.totalCreated++;
        } else {
          totalStats.audits.skipped++;
          totalStats.totalSkipped++;
        }
      }

      skip += audits.length;
      if (audits.length < batchSize) break;
    }
  }

  /**
   * Helper for processing OutboxEvent records if any exist.
   */
  static async _processOutbox(totalStats, { dryRun, batchSize, logger }) {
    const OutboxEvent = mongoose.models.OutboxEvent;
    if (!OutboxEvent) return;

    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const events = await OutboxEvent.find({}).sort({ createdAt: 1 }).skip(skip).limit(batchSize);
      if (!events || events.length === 0) break;

      totalStats.outbox.processed += events.length;
      totalStats.totalScanned += events.length;

      for (const event of events) {
        const payload = event.payload || {};
        const recipient = payload.manager || payload.tenant || payload.recipient;
        if (!recipient) {
          totalStats.outbox.missingRecipients++;
          totalStats.totalMissingRecipients++;
          continue;
        }

        const createdAt = event.createdAt || new Date();
        const createdAtISO = new Date(createdAt).toISOString();
        const idempotencyKey = `notification-backfill:outbox:${event._id}:${event.eventType}:${createdAtISO}`;

        const notifPayload = {
          recipient,
          type: 'renewal',
          category: 'renewal',
          title: `Outbox Event: ${event.eventType}`,
          message: `Processed event ${event.eventType}`,
          priority: 'medium',
          severity: 'information',
          source: 'BACKFILL_MIGRATION',
          sourceModule: 'outbox',
          entityType: event.aggregateType || 'OutboxEvent',
          entityId: event.aggregateId,
          actionUrl: `/notifications`,
          eventId: event.eventId || `EVT-BF-OUT-${event._id.toString().slice(-6).toUpperCase()}`,
          idempotencyKey,
          createdAt,
          metadata: {
            backfilled: true,
            migratedAt: new Date(),
            migrationVersion: 1,
            origin: 'outbox',
            outboxId: event._id.toString()
          }
        };

        const saved = await this._saveNotification(notifPayload, dryRun);
        if (saved) {
          totalStats.outbox.created++;
          totalStats.totalCreated++;
        } else {
          totalStats.outbox.skipped++;
          totalStats.totalSkipped++;
        }
      }

      skip += events.length;
      if (events.length < batchSize) break;
    }
  }

  /**
   * Persists or simulates persisting a Notification document with deterministic idempotency.
   * 
   * @param {Object} payload 
   * @param {boolean} dryRun 
   * @returns {Promise<boolean>} true if created, false if skipped/duplicate
   */
  static async _saveNotification(payload, dryRun) {
    if (!payload || !payload.idempotencyKey) return false;

    // Deterministic Idempotency Check
    const exists = await Notification.exists({ idempotencyKey: payload.idempotencyKey });
    if (exists) {
      return false;
    }

    if (dryRun) {
      return true; // Simulates creation in dry run mode
    }

    try {
      await Notification.create(payload);
      return true;
    } catch (err) {
      if (err.code === 11000) {
        // E11000 duplicate key error in MongoDB
        return false;
      }
      throw err;
    }
  }
}

export default NotificationBackfillService;
