/**
 * Enterprise Admin People & Workforce Mapper
 */

import {
  MOCK_PEOPLE_KPIS,
  MOCK_SPATIAL_PROPERTIES_PEOPLE,
  MOCK_TENANTS,
  MOCK_MANAGERS,
  MOCK_TECHNICIANS,
  MOCK_BUILDING_DIGITAL_TWIN,
} from '../mocks/adminPeopleMock';

export function mapPeopleKPIs(raw) {
  return raw || MOCK_PEOPLE_KPIS;
}

export function mapSpatialPropertiesPeople(raw) {
  return raw || MOCK_SPATIAL_PROPERTIES_PEOPLE;
}

export function mapTenantsList(raw) {
  return raw || MOCK_TENANTS;
}

export function mapManagersList(raw) {
  return raw || MOCK_MANAGERS;
}

export function mapTechniciansList(raw) {
  return raw || MOCK_TECHNICIANS;
}

export function mapBuildingDigitalTwin(raw) {
  return raw || MOCK_BUILDING_DIGITAL_TWIN;
}

export default {
  mapPeopleKPIs,
  mapSpatialPropertiesPeople,
  mapTenantsList,
  mapManagersList,
  mapTechniciansList,
  mapBuildingDigitalTwin,
};
