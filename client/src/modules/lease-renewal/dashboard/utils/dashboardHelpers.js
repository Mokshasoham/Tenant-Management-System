/**
 * Formats date string to professional local calendar date.
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Formats numerical values to standard local currency representation.
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

/**
 * Returns lease health ranking string based on the percentage score.
 */
export const getHealthRating = (score) => {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Critical';
};

/**
 * Resolves color coding tag for lease remaining windows.
 */
export const getRemainingDaysColor = (days) => {
  if (days <= 30) return 'rose';
  if (days <= 60) return 'amber';
  return 'emerald';
};
