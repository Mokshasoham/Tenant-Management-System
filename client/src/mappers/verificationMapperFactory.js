/**
 * Verification Mapper Factory
 * Provides a unified entry point to resolve entity-specific mappers (TENANT, MANAGER, PROPERTY, TECHNICIAN).
 * Prevents direct import fragmentation across portal views.
 */

import tenantVerificationMapper from './tenantVerificationMapper';

const MAPPERS = {
  TENANT: tenantVerificationMapper,
  // Future mappers registered during Phase 5.4 - 5.6:
  // MANAGER: managerVerificationMapper,
  // PROPERTY: propertyVerificationMapper,
  // TECHNICIAN: technicianVerificationMapper,
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
