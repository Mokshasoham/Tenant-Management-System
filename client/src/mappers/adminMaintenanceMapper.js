/**
 * Enterprise Admin Maintenance Command Center Data Mapper
 */

import {
  MOCK_MAINTENANCE_STATUS_COUNTS,
  MOCK_SPATIAL_PROPERTIES,
  MOCK_DAILY_TRENDS,
  MOCK_DATE_DRILLDOWN_EVENTS,
  MOCK_MAINTENANCE_STREAM,
  MOCK_TECHNICIAN_PERFORMANCE,
  MOCK_COST_ANALYTICS,
} from '../mocks/adminMaintenanceMock';

export function mapStatusCounts(raw) {
  return raw || MOCK_MAINTENANCE_STATUS_COUNTS;
}

export function mapSpatialProperties(raw) {
  return raw || MOCK_SPATIAL_PROPERTIES;
}

export function mapDailyTrends(raw) {
  return raw || MOCK_DAILY_TRENDS;
}

export function mapDateDrillDown(propertyName, date, raw) {
  if (raw && raw[propertyName] && raw[propertyName][date]) {
    return raw[propertyName][date];
  }
  return MOCK_DATE_DRILLDOWN_EVENTS[propertyName]?.[date] || [];
}

export function mapMaintenanceStream(raw) {
  return raw || MOCK_MAINTENANCE_STREAM;
}

export function mapTechnicianPerformance(raw) {
  return raw || MOCK_TECHNICIAN_PERFORMANCE;
}

export function mapCostAnalytics(raw) {
  return raw || MOCK_COST_ANALYTICS;
}

export default {
  mapStatusCounts,
  mapSpatialProperties,
  mapDailyTrends,
  mapDateDrillDown,
  mapMaintenanceStream,
  mapTechnicianPerformance,
  mapCostAnalytics,
};
