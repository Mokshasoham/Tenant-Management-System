/**
 * server/src/modules/reporting/utils/ReportAggregationUtils.js
 *
 * Reusable utility helpers for report date filtering, percentage calculations,
 * and common aggregation pipelines.
 */

export function buildDateMatchFilter(dateField, startDate, endDate) {
  const match = {};
  if (startDate || endDate) {
    match[dateField] = {};
    if (startDate) match[dateField].$gte = new Date(startDate);
    if (endDate) match[dateField].$lte = new Date(endDate);
  }
  return match;
}

export function calculatePercentage(part, total) {
  if (!total || total === 0) return 0;
  return Math.round((part / total) * 100);
}

export function calculateAverage(totalSum, count) {
  if (!count || count === 0) return 0;
  return Math.round((totalSum / count) * 100) / 100;
}

export default {
  buildDateMatchFilter,
  calculatePercentage,
  calculateAverage
};
