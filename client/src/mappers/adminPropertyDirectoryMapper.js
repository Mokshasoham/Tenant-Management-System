/**
 * Enterprise Property Directory Mapper
 * Standardizes domain properties, stats, triple metrics, inspection histories, and comparison models.
 */

import {
  MOCK_DIRECTORY_STATS,
  MOCK_RISK_SUMMARY,
  MOCK_REVIEWER_WORKLOAD,
  MOCK_SMART_ALERTS,
  MOCK_SAVED_SEARCHES,
  MOCK_DIRECTORY_PROPERTIES,
  MOCK_INTERNAL_NOTES,
} from '../mocks/adminPropertyDirectoryMock';

export function mapDirectoryProperties(raw) {
  return raw && raw.length > 0 ? raw : MOCK_DIRECTORY_PROPERTIES;
}

export function mapStats(raw) {
  return raw || MOCK_DIRECTORY_STATS;
}

export function mapRiskSummary(raw) {
  return raw || MOCK_RISK_SUMMARY;
}

export function mapWorkload(raw) {
  return raw || MOCK_REVIEWER_WORKLOAD;
}

export function mapSmartAlerts(raw) {
  return raw || MOCK_SMART_ALERTS;
}

export function mapSavedSearches(raw) {
  return raw || MOCK_SAVED_SEARCHES;
}

export function mapInternalNotes(raw) {
  return raw && raw.length > 0 ? raw : MOCK_INTERNAL_NOTES;
}

export function mapComparisonMatrix(propertyIds, allProperties) {
  const properties = mapDirectoryProperties(allProperties);
  return properties.filter((p) => propertyIds.includes(p.id));
}

export default {
  mapDirectoryProperties,
  mapStats,
  mapRiskSummary,
  mapWorkload,
  mapSmartAlerts,
  mapSavedSearches,
  mapInternalNotes,
  mapComparisonMatrix,
};
