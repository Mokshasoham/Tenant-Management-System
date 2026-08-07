/**
 * Verification Mapper Factory
 * Provides a unified entry point to resolve entity-specific mappers (TENANT, MANAGER, PROPERTY, TECHNICIAN).
 * Prevents direct import fragmentation across portal views.
 */

import tenantVerificationMapper from './tenantVerificationMapper';
import propertyVerificationMapper from './propertyVerificationMapper';
import technicianVerificationMapper from './technicianVerificationMapper';

const MAPPERS = {
  TENANT: tenantVerificationMapper,
  PROPERTY: propertyVerificationMapper,
  TECHNICIAN: technicianVerificationMapper,
  // Future mappers registered during Phase 5.6:
  // MANAGER: managerVerificationMapper,
};

/**
 * Resolves the appropriate verification mapper for the target entity type.
 * @param {string} entityType - 'TENANT' | 'MANAGER' | 'PROPERTY' | 'TECHNICIAN'
 * @returns {Object} Resolver object containing mapVerification, mapTrustScore, mapTimeline, mapDocuments, etc.
 */
export function getVerificationMapper(entityType = 'TENANT') {
  const normalizedKey = (entityType || 'TENANT').toUpperCase();
  const mapper = MAPPERS[normalizedKey];

  if (mapper) {
    return mapper;
  }

  // Fallback to tenantVerificationMapper if specified entity mapper is not yet registered
  return tenantVerificationMapper;
}

export default getVerificationMapper;
