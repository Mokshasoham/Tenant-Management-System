/**
 * Client-side validation helper functions for Verification forms & uploads.
 */

export const validateDocumentUpload = (file, templateRules = {}) => {
  const errors = [];
  if (!file) {
    errors.push('Please select a file to upload');
    return { isValid: false, errors };
  }

  const maxSizeBytes = (templateRules.maxSizeBytes || 10) * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    errors.push(`File size exceeds maximum limit of ${templateRules.maxSizeBytes || 10}MB`);
  }

  const allowedTypes = templateRules.allowedFormats || ['pdf', 'png', 'jpg', 'jpeg'];
  const ext = file.name.split('.').pop().toLowerCase();

  if (!allowedTypes.includes(ext)) {
    errors.push(`Invalid format .${ext}. Allowed formats: ${allowedTypes.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateReviewDecision = (decision, remarks = '') => {
  const errors = [];

  if (!decision || !['APPROVE', 'REJECT'].includes(decision.toUpperCase())) {
    errors.push("Decision must be either 'APPROVE' or 'REJECT'");
  }

  if (decision === 'REJECT' && (!remarks || remarks.trim().length === 0)) {
    errors.push('Rejection remarks are required when rejecting a verification');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
