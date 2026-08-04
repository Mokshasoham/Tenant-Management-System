export const RenewalCampaignStatus = {
  DRAFT: 'draft',
  CREATED: 'created',
  WAITING_FOR_TENANT: 'waiting_for_tenant',
  WAITING_FOR_MANAGER: 'waiting_for_manager',
  NEGOTIATING: 'negotiating',
  PENDING_SIGNATURE: 'pending_signature',
  APPROVED: 'approved',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  ESCALATED: 'escalated'
};

export const CampaignSource = {
  MANUAL: 'manual',
  SCHEDULER: 'scheduler',
  API: 'api',
  MIGRATION: 'migration',
  SYSTEM: 'system'
};

export const ALLOWED_CAMPAIGN_TRANSITIONS = {
  [RenewalCampaignStatus.DRAFT]: [RenewalCampaignStatus.CREATED, RenewalCampaignStatus.CANCELLED],
  [RenewalCampaignStatus.CREATED]: [RenewalCampaignStatus.WAITING_FOR_TENANT, RenewalCampaignStatus.CANCELLED],
  [RenewalCampaignStatus.WAITING_FOR_TENANT]: [RenewalCampaignStatus.NEGOTIATING, RenewalCampaignStatus.WAITING_FOR_MANAGER, RenewalCampaignStatus.PENDING_SIGNATURE, RenewalCampaignStatus.CANCELLED, RenewalCampaignStatus.ESCALATED],
  [RenewalCampaignStatus.WAITING_FOR_MANAGER]: [RenewalCampaignStatus.NEGOTIATING, RenewalCampaignStatus.PENDING_SIGNATURE, RenewalCampaignStatus.CANCELLED, RenewalCampaignStatus.ESCALATED],
  [RenewalCampaignStatus.NEGOTIATING]: [RenewalCampaignStatus.PENDING_SIGNATURE, RenewalCampaignStatus.CANCELLED, RenewalCampaignStatus.ESCALATED],
  [RenewalCampaignStatus.PENDING_SIGNATURE]: [RenewalCampaignStatus.APPROVED, RenewalCampaignStatus.CANCELLED, RenewalCampaignStatus.ESCALATED],
  [RenewalCampaignStatus.APPROVED]: [RenewalCampaignStatus.COMPLETED, RenewalCampaignStatus.CANCELLED],
  [RenewalCampaignStatus.COMPLETED]: [],
  [RenewalCampaignStatus.EXPIRED]: [],
  [RenewalCampaignStatus.CANCELLED]: [],
  [RenewalCampaignStatus.ESCALATED]: [RenewalCampaignStatus.WAITING_FOR_MANAGER, RenewalCampaignStatus.CANCELLED]
};
