import logger from '../platform/logging/logger.js';

export class IdentityDecisionService {
  /**
   * Determine final identity verification status from provider output and matching result
   */
  evaluateDecision(providerResponse = {}, matchEvaluation = {}) {
    const { status: providerStatus, confidenceScore = 0 } = providerResponse;
    const { matchResult = 'UNKNOWN', mismatchFields = [] } = matchEvaluation;

    // Provider direct failure or unavailable
    if (providerStatus === 'UNAVAILABLE' || providerStatus === 'NETWORK_FAILURE' || providerStatus === 'RATE_LIMITED') {
      return {
        verificationStatus: 'UNAVAILABLE',
        reason: providerResponse.reason || 'Identity provider service is currently unavailable',
        requiresManualReview: true,
      };
    }

    // Critical mismatch in hard identity attributes (Name mismatch or DOB mismatch)
    if (matchResult === 'MISMATCH' || mismatchFields.includes('name') || mismatchFields.includes('dob')) {
      return {
        verificationStatus: 'REVIEW_REQUIRED',
        reason: `Identity data mismatch detected on fields: [${mismatchFields.join(', ')}]. Routed to Admin review.`,
        requiresManualReview: true,
      };
    }

    // Direct provider failure
    if (providerResponse.success === false && providerStatus === 'FAILED') {
      return {
        verificationStatus: 'REJECTED',
        reason: providerResponse.reason || 'Document validation failed by identity provider',
        requiresManualReview: false,
      };
    }

    // High confidence match
    if (providerResponse.success === true && (matchResult === 'MATCH' || confidenceScore >= 85)) {
      return {
        verificationStatus: 'VERIFIED',
        reason: 'Identity verified successfully with high confidence',
        requiresManualReview: false,
      };
    }

    // Partial match or medium confidence -> Review Required
    if (matchResult === 'PARTIAL_MATCH' || confidenceScore >= 50) {
      return {
        verificationStatus: 'REVIEW_REQUIRED',
        reason: 'Partial identity match or spelling variation detected. Routed for manual review.',
        requiresManualReview: true,
      };
    }

    return {
      verificationStatus: 'REVIEW_REQUIRED',
      reason: 'Uncertain verification result. Routed for manual review.',
      requiresManualReview: true,
    };
  }
}

export default new IdentityDecisionService();
