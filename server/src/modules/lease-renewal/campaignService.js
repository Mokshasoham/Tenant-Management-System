import * as repository from './leaseRenewalCampaignRepository.js';
import Lease from '../../models/Lease.js';
import User from '../../models/User.js';
import Tenant from '../../models/Tenant.js';
import Counter from '../../models/Counter.js';
import { logRenewalAudit } from '../../platform/audit/auditService.js';
import { dispatchEvent } from '../../platform/events/eventDispatcher.js';
import { RenewalCampaignStatus, ALLOWED_CAMPAIGN_TRANSITIONS } from './campaignConstants.js';
import { toCampaignDto } from './campaignDto.js';

/**
 * Creates a new lease renewal campaign.
 */
export const createCampaign = async (leaseId, source, user, auditContext = {}) => {
  const lease = await Lease.findById(leaseId).populate('tenant property');
  if (!lease) {
    throw new Error('Target lease not found.');
  }

  // Verify compound unique constraint (no active campaign for this lease)
  const activeStatuses = ['draft', 'created', 'waiting_for_tenant', 'waiting_for_manager', 'negotiating', 'pending_signature', 'approved', 'escalated'];
  const duplicate = await repository.findForDashboard({
    lease: leaseId,
    status: { $in: activeStatuses }
  });
  if (duplicate.length > 0) {
    throw new Error('An active renewal campaign already exists for this lease.');
  }

  // Generate sequence number using date-specific atomic counter (LCP-YYYYMMDD-000001 format)
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const counter = await Counter.findOneAndUpdate(
    { _id: `CAMPAIGN-${dateStr}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  const seqStr = String(counter.seq).padStart(6, '0');
  const campaignNumber = `LCP-${dateStr}-${seqStr}`;

  const tenantRecord = await Tenant.findById(lease.tenant);
  const tenantUser = tenantRecord ? await User.findOne({ email: tenantRecord.email }) : null;
  const managerUser = await User.findById(lease.createdBy);

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

  const campaign = await repository.create(payload);

  // Write Audit Log
  await logRenewalAudit({
    leaseRenewalId: campaign._id,
    userId: user.userId,
    action: 'CAMPAIGN_CREATE',
    newValue: campaign.toObject(),
    ...auditContext
  });

  // Transactional Event Dispatch
  await dispatchEvent('lease.renewal.campaign.created', {
    campaignId: campaign._id,
    campaignNumber: campaign.campaignNumber,
    leaseId: campaign.lease,
    userId: user.userId
  });

  return toCampaignDto(campaign);
};

/**
 * Transitions a campaign to another status.
 */
export const transitionStatus = async (id, nextStatus, user, auditContext = {}) => {
  const campaign = await repository.findById(id);
  if (!campaign) {
    throw new Error('Campaign not found.');
  }

  const allowed = ALLOWED_CAMPAIGN_TRANSITIONS[campaign.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Invalid campaign state transition from ${campaign.status} to ${nextStatus}`);
  }

  const oldValue = campaign.toObject();
  
  const lifecycleUpdates = { ...campaign.lifecycle };
  if (nextStatus === RenewalCampaignStatus.WAITING_FOR_TENANT) lifecycleUpdates.waitingTenantAt = new Date();
  if (nextStatus === RenewalCampaignStatus.NEGOTIATING) lifecycleUpdates.negotiationStartedAt = new Date();
  if (nextStatus === RenewalCampaignStatus.PENDING_SIGNATURE) lifecycleUpdates.pendingSignatureAt = new Date();
  if (nextStatus === RenewalCampaignStatus.APPROVED) lifecycleUpdates.approvedAt = new Date();
  if (nextStatus === RenewalCampaignStatus.COMPLETED) lifecycleUpdates.completedAt = new Date();
  if (nextStatus === RenewalCampaignStatus.EXPIRED) lifecycleUpdates.expiredAt = new Date();

  const updated = await repository.update(id, {
    status: nextStatus,
    lifecycle: lifecycleUpdates,
    lastActivityAt: new Date()
  }, campaign.version);

  // Write Audit Log
  await logRenewalAudit({
    leaseRenewalId: updated._id,
    userId: user.userId,
    action: 'CAMPAIGN_STATUS_TRANSITION',
    oldValue,
    newValue: updated.toObject(),
    ...auditContext
  });

  // Transactional Event Dispatch
  const eventName = nextStatus === RenewalCampaignStatus.CANCELLED ? 'lease.renewal.campaign.cancelled' : 'lease.renewal.campaign.updated';
  await dispatchEvent(eventName, {
    campaignId: updated._id,
    status: updated.status,
    userId: user.userId
  });

  return toCampaignDto(updated);
};
