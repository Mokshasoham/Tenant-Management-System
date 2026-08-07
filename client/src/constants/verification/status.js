export const VERIFICATION_STATUS_CONFIG = {
  DRAFT: { label: 'Draft', variant: 'warning', description: 'Verification submission is in progress' },
  DOCUMENTS_UPLOADED: { label: 'Documents Ready', variant: 'info', description: 'Required documents uploaded' },
  SUBMITTED: { label: 'Submitted', variant: 'info', description: 'Awaiting review' },
  AUTO_REVIEW: { label: 'Automated Check', variant: 'info', description: 'System verifying document format & authenticity' },
  MANAGER_REVIEW: { label: 'Manager Review', variant: 'warning', description: 'Under review by property manager' },
  ADMIN_REVIEW: { label: 'Admin Audit', variant: 'warning', description: 'Pending final compliance approval' },
  APPROVED: { label: 'Verified', variant: 'success', description: 'Full verification approved' },
  REJECTED: { label: 'Rejected', variant: 'danger', description: 'Verification request rejected' },
  EXPIRED: { label: 'Expired', variant: 'danger', description: 'Verification documents have expired' },
};
