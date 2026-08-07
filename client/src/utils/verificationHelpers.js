import { VERIFICATION_STATUS_CONFIG } from '../constants/verification/status';

export const formatVerificationStatus = (status = 'DRAFT') => {
  const config = VERIFICATION_STATUS_CONFIG[status.toUpperCase()];
  return config ? config.label : status;
};

export const getSlaStatusInfo = (sla = {}) => {
  if (!sla || !sla.targetReviewAt) {
    return { label: 'ON TIME', isOverdue: false, colorClass: 'text-emerald-500' };
  }
  if (sla.isOverdue || (sla.targetReviewAt && new Date(sla.targetReviewAt) < new Date())) {
    return { label: 'OVERDUE', isOverdue: true, colorClass: 'text-rose-500 font-bold' };
  }
  return { label: 'ON TIME', isOverdue: false, colorClass: 'text-emerald-500 font-semibold' };
};

export const calculateStepProgress = (completedCount = 0, totalCount = 1) => {
  if (totalCount <= 0) return 0;
  return Math.min(100, Math.round((completedCount / totalCount) * 100));
};
