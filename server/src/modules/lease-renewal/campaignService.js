import mongoose from 'mongoose';
import * as repository from './leaseRenewalCampaignRepository.js';
import Lease from '../../models/Lease.js';
import User from '../../models/User.js';
import Tenant from '../../models/Tenant.js';
import Counter from '../../models/Counter.js';
import { logRenewalAudit } from '../../platform/audit/auditService.js';
import { writeOutboxEvent } from '../../platform/events/outboxService.js';
import { RenewalCampaignStatus, ALLOWED_CAMPAIGN_TRANSITIONS } from './campaignConstants.js';
import { toCampaignDto } from './campaignDto.js';
import campaignAnalyticsService from './analytics/CampaignAnalyticsService.js';

/**
 * Creates a new lease renewal campaign inside a transaction session with outbox event persistence.
 *
 * @param {string} leaseId
 * @param {string} source               - CampaignSource ('manual', 'scheduler', etc.)
 * @param {object} actor                - Actor context (User or SystemPrincipal)
 * @param {object} [auditContext={}]    - Rich audit tracing (reason, scheduler, executionId, batchId)
 * @param {object} [options={}]         - { session }
 */
export const createCampaign = async (leaseId, source, actor = {}, auditContext = {}, options = {}) => {
  const actorId = actor.id || actor.userId || 'system';

  const executeUnitOfWork = async (session) => {
    const opts = session ? { session } : {};

    const lease = await Lease.findOne({ _id: leaseId }, null, opts).populate('tenant property');
    if (!lease) {
      throw new Error('Target lease not found.');
    }

    // Verify compound unique constraint (no active campaign for this lease)
    const activeStatuses = ['draft', 'created', 'waiting_for_tenant', 'waiting_for_manager', 'negotiating', 'pending_signature', 'approved', 'escalated'];
    const duplicate = await repository.findForDashboard({
      lease: leaseId,
      status: { $in: activeStatuses }
    }, opts);

    if (duplicate.length > 0) {
      throw new Error('An active renewal campaign already exists for this lease.');
    }

    // Generate sequence number using date-specific atomic counter (LCP-YYYYMMDD-000001 format)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const counter = await Counter.findOneAndUpdate(
      { _id: `CAMPAIGN-${dateStr}` },
      { $inc: { seq: 1 } },
      { upsert: true, new: true, ...opts }
    );
    const seqStr = String(counter.seq).padStart(6, '0');
    const campaignNumber = `LCP-${dateStr}-${seqStr}`;

    const tenantRecord = await Tenant.findOne({ _id: lease.tenant }, null, opts);
    const tenantUser = tenantRecord ? await User.findOne({ email: tenantRecord.email }, null, opts) : null;
    const managerUser = await User.findOne({ _id: lease.createdBy }, null, opts);

    const payload = {
      campaignNumber,
      lease: lease._id,
      tenant: lease.tenant._id,
      manager: lease.createdBy,
      property: lease.property._id,
      startDate: lease.startDate,
      expiryDate: lease.endDate,
      source,
      status: RenewalCampaignStatus.DRAFT,
      snapshot: {
        tenantName: tenantUser ? `${tenantUser.firstName} ${tenantUser.lastName}` : tenantRecord?.name || 'Tenant Name',
        propertyName: lease.property.name,
        propertyAddress: lease.property.address || 'Property Address',
        leaseNumber: lease.leaseNumber,
        managerName: managerUser ? `${managerUser.name || managerUser.email}` : 'Property Manager'
      },
      lifecycle: {
        createdAt: new Date()
      }
    };

    const campaign = await repository.create(payload, opts);

    // Write Audit Log with rich metadata
    await logRenewalAudit({
      leaseRenewalId: campaign._id,
      userId: actorId,
      action: 'CAMPAIGN_CREATE',
      newValue: typeof campaign.toObject === 'function' ? campaign.toObject() : campaign,
      reason: auditContext.reason || 'CAMPAIGN_AUTOMATION_CREATION',
      scheduler: auditContext.scheduler || null,
      executionId: auditContext.executionId || actor.requestId || null,
      batchId: auditContext.batchId || actor.correlationId || null,
      ...auditContext
    });

    // Write Transactional Outbox Event
    await writeOutboxEvent(
      {
        eventType: 'lease.renewal.campaign.created',
        aggregateType: 'LeaseRenewalCampaign',
        aggregateId: campaign._id,
        actor,
        payload: {
          campaignId: campaign._id,
          campaignNumber: campaign.campaignNumber,
          leaseId: campaign.lease,
          status: campaign.status,
          source: campaign.source
        }
      },
      opts
    );

    return toCampaignDto(campaign);
  };

  // Session reuse or fallback
  if (options.session) {
    return await executeUnitOfWork(options.session);
  }

  // Attempt standalone session transaction if replica set supports it
  let session = null;
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      session = await mongoose.startSession();
      session.startTransaction();
    }
    const result = await executeUnitOfWork(session);
    if (session && session.inTransaction()) {
      await session.commitTransaction();
    }
    campaignAnalyticsService.invalidateAnalyticsCache().catch(() => {});
    return result;
  } catch (err) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (session) session.endSession();
  }
};

/**
 * Transitions a campaign to another status using atomic repository transitions and outbox events.
 *
 * @param {string} id
 * @param {string} nextStatus
 * @param {object} actor                - User or SystemPrincipal
 * @param {object} [auditContext={}]    - Rich audit tracing
 * @param {object} [options={}]         - { session }
 */
export const transitionStatus = async (id, nextStatus, actor = {}, auditContext = {}, options = {}) => {
  const actorId = actor.id || actor.userId || 'system';

  const executeUnitOfWork = async (session) => {
    const opts = session ? { session } : {};

    const campaign = await repository.findById(id, opts);
    if (!campaign) {
      throw new Error('Campaign not found.');
    }

    const allowed = ALLOWED_CAMPAIGN_TRANSITIONS[campaign.status] || [];
    if (!allowed.includes(nextStatus)) {
      throw new Error(`Invalid campaign state transition from ${campaign.status} to ${nextStatus}`);
    }

    const oldValue = typeof campaign.toObject === 'function' ? campaign.toObject() : campaign;

    const lifecycleUpdates = { ...campaign.lifecycle };
    if (nextStatus === RenewalCampaignStatus.WAITING_FOR_TENANT) lifecycleUpdates.waitingTenantAt = new Date();
    if (nextStatus === RenewalCampaignStatus.NEGOTIATING) lifecycleUpdates.negotiationStartedAt = new Date();
    if (nextStatus === RenewalCampaignStatus.PENDING_SIGNATURE) lifecycleUpdates.pendingSignatureAt = new Date();
    if (nextStatus === RenewalCampaignStatus.APPROVED) lifecycleUpdates.approvedAt = new Date();
    if (nextStatus === RenewalCampaignStatus.COMPLETED) lifecycleUpdates.completedAt = new Date();
    if (nextStatus === RenewalCampaignStatus.EXPIRED) lifecycleUpdates.expiredAt = new Date();

    // Atomic repository transition
    const updated = await repository.transitionIfCurrentStatus(
      id,
      campaign.status,
      nextStatus,
      { lifecycle: lifecycleUpdates },
      opts
    );

    if (!updated) {
      throw new Error(`Race condition detected: Campaign ${id} was modified by another process.`);
    }

    // Write Audit Log
    await logRenewalAudit({
      leaseRenewalId: updated._id,
      userId: actorId,
      action: 'CAMPAIGN_STATUS_TRANSITION',
      oldValue,
      newValue: typeof updated.toObject === 'function' ? updated.toObject() : updated,
      reason: auditContext.reason || `TRANSITION_TO_${nextStatus.toUpperCase()}`,
      scheduler: auditContext.scheduler || null,
      executionId: auditContext.executionId || actor.requestId || null,
      batchId: auditContext.batchId || actor.correlationId || null,
      ...auditContext
    });

    // Determine targeted event name according to state machine
    let eventName = 'lease.renewal.campaign.updated';
    if (nextStatus === RenewalCampaignStatus.EXPIRED) eventName = 'lease.renewal.campaign.expired';
    if (nextStatus === RenewalCampaignStatus.ESCALATED) eventName = 'lease.renewal.campaign.escalated';
    if (nextStatus === RenewalCampaignStatus.CANCELLED) eventName = 'lease.renewal.campaign.cancelled';

    // Write Transactional Outbox Event
    await writeOutboxEvent(
      {
        eventType: eventName,
        aggregateType: 'LeaseRenewalCampaign',
        aggregateId: updated._id,
        actor,
        payload: {
          campaignId: updated._id,
          status: updated.status,
          previousStatus: campaign.status,
          campaignNumber: updated.campaignNumber
        }
      },
      opts
    );

    return toCampaignDto(updated);
  };

  if (options.session) {
    return await executeUnitOfWork(options.session);
  }

  let session = null;
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      session = await mongoose.startSession();
      session.startTransaction();
    }
    const result = await executeUnitOfWork(session);
    if (session && session.inTransaction()) {
      await session.commitTransaction();
    }
    campaignAnalyticsService.invalidateAnalyticsCache().catch(() => {});
    return result;
  } catch (err) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (session) session.endSession();
  }
};
