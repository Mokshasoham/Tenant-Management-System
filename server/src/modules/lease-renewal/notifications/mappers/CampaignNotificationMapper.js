import mongoose from 'mongoose';

/**
 * CampaignNotificationMapper
 * Converts historical LeaseRenewalCampaign records into Notification payload objects.
 */
export class CampaignNotificationMapper {
  static async map(campaign, options = {}) {
    if (!campaign) return [];

    const results = [];

    const managerRecipient = campaign.manager || campaign.createdBy;
    if (!managerRecipient) {
      return [{ missingRecipient: true, origin: 'campaign', id: campaign._id }];
    }

    const campaignNum = campaign.campaignNumber || campaign._id.toString();

    // 1. Campaign Created Event
    const createdAt = campaign.createdAt || new Date();
    const createdAtISO = new Date(createdAt).toISOString();
    const eventType = 'lease.renewal.campaign.created';
    const aggregateId = campaign._id.toString();
    const idempotencyKey = `notification-backfill:campaign:${aggregateId}:${eventType}:${createdAtISO}`;

    results.push({
      payload: {
        recipient: managerRecipient,
        type: 'renewal',
        category: 'renewal',
        title: 'New Renewal Campaign Created',
        message: `Campaign ${campaignNum} has been created for lease renewal.`,
        priority: 'medium',
        severity: 'information',
        source: 'BACKFILL_MIGRATION',
        sourceModule: 'lease-renewal',
        entityType: 'LeaseRenewalCampaign',
        entityId: campaign._id,
        actionUrl: `/lease-renewals/campaigns/${campaign._id}`,
        redirectUrl: `/lease-renewals/campaigns/${campaign._id}`,
        eventId: `EVT-BF-CMP-CRT-${aggregateId.slice(-6).toUpperCase()}`,
        idempotencyKey,
        createdAt,
        metadata: {
          backfilled: true,
          migratedAt: new Date(),
          migrationVersion: 1,
          origin: 'campaign',
          campaignId: campaign._id.toString(),
          campaignNumber: campaignNum
        }
      }
    });

    // 2. SLA Warning Event if triggered
    if (campaign.slaWarningTriggered) {
      const warningDate = campaign.updatedAt || createdAt;
      const warningISO = new Date(warningDate).toISOString();
      const warningEventType = 'lease.renewal.sla.warning';
      const warningKey = `notification-backfill:campaign:${aggregateId}:${warningEventType}:${warningISO}`;

      results.push({
        payload: {
          recipient: managerRecipient,
          type: 'renewal',
          category: 'renewal',
          title: 'SLA Warning: Campaign Approaching Breach',
          message: `Campaign ${campaignNum} is approaching its SLA expiration limit.`,
          priority: 'high',
          severity: 'warning',
          source: 'BACKFILL_MIGRATION',
          sourceModule: 'lease-renewal',
          entityType: 'LeaseRenewalCampaign',
          entityId: campaign._id,
          actionUrl: `/lease-renewals/campaigns/${campaign._id}`,
          redirectUrl: `/lease-renewals/campaigns/${campaign._id}`,
          eventId: `EVT-BF-CMP-SLA-WRN-${aggregateId.slice(-6).toUpperCase()}`,
          idempotencyKey: warningKey,
          createdAt: warningDate,
          metadata: {
            backfilled: true,
            migratedAt: new Date(),
            migrationVersion: 1,
            origin: 'campaign',
            campaignId: campaign._id.toString(),
            campaignNumber: campaignNum
          }
        }
      });
    }

    // 3. Status-based proven milestone events
    if (campaign.status === 'escalated' || campaign.slaBreached) {
      const escDate = campaign.updatedAt || createdAt;
      const escISO = new Date(escDate).toISOString();
      const escEventType = 'lease.renewal.campaign.escalated';
      const escKey = `notification-backfill:campaign:${aggregateId}:${escEventType}:${escISO}`;

      results.push({
        payload: {
          recipient: managerRecipient,
          type: 'renewal',
          category: 'renewal',
          title: 'Campaign Escalated',
          message: `Campaign ${campaignNum} has been escalated for senior manager review.`,
          priority: 'critical',
          severity: 'critical',
          source: 'BACKFILL_MIGRATION',
          sourceModule: 'lease-renewal',
          entityType: 'LeaseRenewalCampaign',
          entityId: campaign._id,
          actionUrl: `/lease-renewals/campaigns/${campaign._id}`,
          redirectUrl: `/lease-renewals/campaigns/${campaign._id}`,
          eventId: `EVT-BF-CMP-ESC-${aggregateId.slice(-6).toUpperCase()}`,
          idempotencyKey: escKey,
          createdAt: escDate,
          metadata: {
            backfilled: true,
            migratedAt: new Date(),
            migrationVersion: 1,
            origin: 'campaign',
            campaignId: campaign._id.toString(),
            campaignNumber: campaignNum
          }
        }
      });
    } else if (campaign.status === 'completed') {
      const compDate = campaign.updatedAt || createdAt;
      const compISO = new Date(compDate).toISOString();
      const compEventType = 'lease.renewal.completed';
      const compKey = `notification-backfill:campaign:${aggregateId}:${compEventType}:${compISO}`;

      results.push({
        payload: {
          recipient: managerRecipient,
          type: 'renewal',
          category: 'renewal',
          title: 'Lease Renewal Completed',
          message: `Lease renewal campaign ${campaignNum} successfully completed!`,
          priority: 'medium',
          severity: 'success',
          source: 'BACKFILL_MIGRATION',
          sourceModule: 'lease-renewal',
          entityType: 'LeaseRenewalCampaign',
          entityId: campaign._id,
          actionUrl: `/lease-renewals/campaigns/${campaign._id}`,
          redirectUrl: `/lease-renewals/campaigns/${campaign._id}`,
          eventId: `EVT-BF-CMP-CMPL-${aggregateId.slice(-6).toUpperCase()}`,
          idempotencyKey: compKey,
          createdAt: compDate,
          metadata: {
            backfilled: true,
            migratedAt: new Date(),
            migrationVersion: 1,
            origin: 'campaign',
            campaignId: campaign._id.toString(),
            campaignNumber: campaignNum
          }
        }
      });
    }

    return results;
  }
}

export default CampaignNotificationMapper;
