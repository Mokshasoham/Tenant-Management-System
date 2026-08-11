import logger from '../platform/logging/logger.js';

export class PropertyDecisionService {
  /**
   * Deterministically evaluates final property verification status.
   */
  evaluateDecision(providerResponse = {}, matchEvaluation = {}) {
    const { status: providerStatus, confidenceScore = 0 } = providerResponse;
    const { matchResult = 'UNKNOWN', mismatchFields = [] } = matchEvaluation;

    // 1. Provider Unavailable / Service Down
    if (
      providerStatus === 'UNAVAILABLE' ||
      providerStatus === 'NETWORK_FAILURE' ||
      providerStatus === 'RATE_LIMITED' ||
      providerStatus === 'SERVICE_DOWN' ||
      providerStatus === 'TIMEOUT'
    ) {
      return {
        verificationStatus: 'UNAVAILABLE',
        reason: providerResponse.reason || 'Property title registry service is currently unavailable',
        requiresManualReview: true,
      };
    }

    // 2. Confirmed Ownership or Address Mismatch -> Review Required
    if (matchResult === 'MISMATCH' || mismatchFields.includes('ownerName') || mismatchFields.includes('address')) {
      return {
        verificationStatus: 'REVIEW_REQUIRED',
        reason: `Property ownership/title mismatch on fields: [${mismatchFields.join(', ')}]. Routed for Admin review.`,
        requiresManualReview: true,
      };
    }

    // 3. Direct Provider Processing Failure
    if (providerResponse.success === false && providerStatus === 'FAILED') {
      return {
        verificationStatus: 'REJECTED',
        reason: providerResponse.reason || 'Property title deed validation failed at land registry',
        requiresManualReview: false,
      };
    }

    // 4. High Confidence Verification Match
    if (providerResponse.success === true && (matchResult === 'MATCH' || confidenceScore >= 85)) {
      return {
        verificationStatus: 'VERIFIED',
        reason: 'Property title & ownership verified successfully with high confidence',
        requiresManualReview: false,
      };
    }

    // 5. Partial Match or Ambiguous Fields -> Review Required
    if (matchResult === 'PARTIAL_MATCH' || confidenceScore >= 50) {
      return {
        verificationStatus: 'REVIEW_REQUIRED',
        reason: 'Partial property title match detected. Routed for manual review.',
        requiresManualReview: true,
      };
    }

    return {
      verificationStatus: 'REVIEW_REQUIRED',
      reason: 'Uncertain property verification outcome. Routed for manual review.',
      requiresManualReview: true,
    };
  }
}

export default new PropertyDecisionService();
