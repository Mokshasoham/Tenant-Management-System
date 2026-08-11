import logger from '../platform/logging/logger.js';

export class IdentityMatchingService {
  /**
   * Compare user profile against extracted document data and provider response
   */
  matchIdentity(userProfile = {}, providerExtractedData = {}) {
    let score = 0;
    const mismatchFields = [];
    const matchedFields = [];

    // 1. Name Match Comparison (40 Points max)
    const userFullName = `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim().toLowerCase();
    const extractedName = (providerExtractedData.name || providerExtractedData.fullName || '').trim().toLowerCase();

    if (userFullName && extractedName) {
      if (userFullName === extractedName) {
        score += 40;
        matchedFields.push('name');
      } else if (userFullName.includes(extractedName) || extractedName.includes(userFullName) || this.fuzzyMatch(userFullName, extractedName)) {
        score += 30;
        matchedFields.push('name_partial');
        mismatchFields.push('name_spelling_variation');
      } else {
        mismatchFields.push('name');
      }
    } else {
      score += 20; // Default baseline if single attribute is missing
    }

    // 2. Date of Birth Comparison (30 Points max)
    const userDob = userProfile.dob || userProfile.dateOfBirth;
    const extractedDob = providerExtractedData.dob || providerExtractedData.dateOfBirth;

    if (userDob && extractedDob) {
      const formattedUserDob = new Date(userDob).toISOString().split('T')[0];
      const formattedExtractedDob = new Date(extractedDob).toISOString().split('T')[0];

      if (formattedUserDob === formattedExtractedDob) {
        score += 30;
        matchedFields.push('dob');
      } else {
        mismatchFields.push('dob');
      }
    } else {
      score += 20;
    }

    // 3. Document Reference Match (30 Points max)
    if (providerExtractedData.documentNumber) {
      score += 30;
      matchedFields.push('documentNumber');
    } else {
      score += 15;
    }

    // Evaluate Overall Classification
    let matchResult = 'UNKNOWN';
    if (score >= 90 && mismatchFields.length === 0) {
      matchResult = 'MATCH';
    } else if (score >= 60 || mismatchFields.includes('name_spelling_variation')) {
      matchResult = 'PARTIAL_MATCH';
    } else if (mismatchFields.includes('name') || mismatchFields.includes('dob')) {
      matchResult = 'MISMATCH';
    }

    logger.info(`[IdentityMatchingService] Score: ${score}/100, MatchResult: ${matchResult}, Mismatches: [${mismatchFields.join(', ')}]`);

    return {
      confidenceScore: Math.min(100, Math.max(0, score)),
      matchResult,
      mismatchFields,
      matchedFields,
    };
  }

  fuzzyMatch(str1, str2) {
    if (!str1 || !str2) return false;
    const parts1 = str1.split(' ');
    const parts2 = str2.split(' ');
    return parts1.some(p => parts2.includes(p));
  }
}

export default new IdentityMatchingService();
