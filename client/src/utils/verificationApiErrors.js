/**
 * Maps HTTP status codes & raw API error messages into user-friendly localized messages.
 */
export const formatVerificationApiError = (error) => {
  if (!error) return 'An unexpected error occurred. Please try again.';

  if (typeof error === 'string') {
    return error;
  }

  const message = error.message || error.error || error.data?.message;
  const status = error.status || error.response?.status;

  switch (status) {
    case 400:
      return message || 'Invalid input request. Please check submitted document details.';
    case 401:
      return 'Session expired. Please log in again to continue verification.';
    case 403:
      return 'Access forbidden. You do not have permissions to perform this action.';
    case 404:
      return 'Verification record or template not found.';
    case 409:
      return 'A verification submission is already active for this entity.';
    case 422:
      return message || 'Document validation failed. Check file dimensions and format.';
    case 500:
      return 'Verification server error. Our team has been notified.';
    default:
      return message || 'Failed to process verification. Please try again.';
  }
};

export default formatVerificationApiError;
