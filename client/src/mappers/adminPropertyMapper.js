/**
 * Admin Property Workspace Data Transformation Mapper
 */

import {
  MOCK_PROPERTY_DETAILS,
  MOCK_TENANT_REVIEWS,
  MOCK_GROUPED_DOCUMENTS,
  MOCK_PROPERTY_TIMELINE,
  MOCK_PROPERTY_AUDIT_LOG,
  MOCK_COMMUNICATIONS,
  MOCK_PROPERTY_REPORTS,
} from '../mocks/adminPropertyMock';

export function mapPropertyDetails(id, raw) {
  return raw || MOCK_PROPERTY_DETAILS;
}

export function mapTenantReviews(id, raw) {
  return raw || MOCK_TENANT_REVIEWS;
}

export function mapGroupedDocuments(id, raw) {
  return raw || MOCK_GROUPED_DOCUMENTS;
}

export function mapTimeline(id, raw) {
  return raw || MOCK_PROPERTY_TIMELINE;
}

export function mapAuditLog(id, raw) {
  return raw || MOCK_PROPERTY_AUDIT_LOG;
}

export function mapCommunications(id, raw) {
  return raw || MOCK_COMMUNICATIONS;
}

export function mapReports(id, raw) {
  return raw || MOCK_PROPERTY_REPORTS;
}

export default {
  mapPropertyDetails,
  mapTenantReviews,
  mapGroupedDocuments,
  mapTimeline,
  mapAuditLog,
  mapCommunications,
  mapReports,
};
