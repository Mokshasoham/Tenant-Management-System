import { ROLE_PERMISSIONS } from '../constants/verification/permissions';

export const canUpload = (user) => {
  if (!user || !user.role) return false;
  return ROLE_PERMISSIONS[user.role]?.includes('UPLOAD') || ROLE_PERMISSIONS[user.role]?.includes('UPLOAD_SELF');
};

export const canSubmit = (user) => {
  if (!user || !user.role) return false;
  return ROLE_PERMISSIONS[user.role]?.includes('SUBMIT') || ROLE_PERMISSIONS[user.role]?.includes('SUBMIT_SELF');
};

export const canReviewLevel2 = (user) => {
  if (!user || !user.role) return false;
  return ROLE_PERMISSIONS[user.role]?.includes('REVIEW_LEVEL2');
};

export const canApprove = (user) => {
  if (!user || !user.role) return false;
  return ROLE_PERMISSIONS[user.role]?.includes('APPROVE_LEVEL3');
};

export const canReject = (user) => {
  if (!user || !user.role) return false;
  return ROLE_PERMISSIONS[user.role]?.includes('REJECT_LEVEL3');
};

export const canViewHistory = (user, targetEntityId) => {
  if (!user || !user.role) return false;
  if (['admin', 'manager'].includes(user.role)) return true;
  const userId = user.userId || user._id || user.id;
  return userId && targetEntityId && userId.toString() === targetEntityId.toString();
};

export const canEditDraft = (user, targetEntityId) => {
  if (!user || !user.role) return false;
  if (user.role === 'admin') return true;
  const userId = user.userId || user._id || user.id;
  return userId && targetEntityId && userId.toString() === targetEntityId.toString();
};

export const canResubmit = (user, targetEntityId) => {
  return canEditDraft(user, targetEntityId);
};
