import logger from '../platform/logging/logger.js';

export class PropertyMatchingService {
  /**
   * Compares database Property record against extracted document/provider data.
   */
  matchProperty(registeredProperty = {}, extractedPropertyData = {}) {
    let score = 0;
    const mismatchFields = [];
    const matchedFields = [];

    const safeStr = (val) => {
      if (!val) return '';
      if (typeof val === 'string') return val.trim().toLowerCase();
      if (typeof val === 'object' && val._id) return String(val._id).trim().toLowerCase();
      return String(val).trim().toLowerCase();
    };

    // 1. Owner Name Comparison (30 points max)
    const dbOwner = safeStr(registeredProperty.ownerName || registeredProperty.owner);
    const extractedOwner = safeStr(extractedPropertyData.ownerName);

    if (dbOwner && extractedOwner && extractedOwner !== 'unknown') {
      if (dbOwner === extractedOwner) {
        score += 30;
        matchedFields.push('ownerName');
      } else if (dbOwner.includes(extractedOwner) || extractedOwner.includes(dbOwner) || this.fuzzyMatch(dbOwner, extractedOwner)) {
        score += 20;
        matchedFields.push('ownerName_partial');
        mismatchFields.push('ownerName_variation');
      } else {
        mismatchFields.push('ownerName');
      }
    } else {
      score += 15;
    }

    // 2. Property Address & PIN Code Comparison (30 points max)
    const dbAddress = safeStr(registeredProperty.address || registeredProperty.location);
    const extractedAddress = safeStr(extractedPropertyData.address);

    if (dbAddress && extractedAddress && extractedAddress !== 'unknown') {
      if (dbAddress === extractedAddress || this.fuzzyMatch(dbAddress, extractedAddress)) {
        score += 30;
        matchedFields.push('address');
      } else {
        score += 10;
        mismatchFields.push('address');
      }
    } else {
      score += 15;
    }

    // 3. Survey Number & Registration Number (25 points max)
    const dbSurvey = safeStr(registeredProperty.surveyNumber);
    const extractedSurvey = safeStr(extractedPropertyData.surveyNumber);

    if (dbSurvey && extractedSurvey && extractedSurvey !== 'unknown') {
      if (dbSurvey === extractedSurvey) {
        score += 25;
        matchedFields.push('surveyNumber');
      } else {
        mismatchFields.push('surveyNumber');
      }
    } else {
      score += 15;
    }

    // 4. Property Type & Area (15 points max)
    const dbType = safeStr(registeredProperty.propertyType || registeredProperty.type);
    const extractedType = safeStr(extractedPropertyData.propertyType);

    if (dbType && extractedType && extractedType !== 'unknown') {
      if (dbType === extractedType) {
        score += 15;
        matchedFields.push('propertyType');
      } else {
        mismatchFields.push('propertyType');
      }
    } else {
      score += 10;
    }

    // Classification Logic
    let matchResult = 'UNKNOWN';
    if (mismatchFields.includes('ownerName') || mismatchFields.includes('address') || mismatchFields.includes('surveyNumber')) {
      matchResult = 'MISMATCH';
    } else if (score >= 90 && mismatchFields.length === 0) {
      matchResult = 'MATCH';
    } else if (score >= 60 || mismatchFields.includes('ownerName_variation') || mismatchFields.includes('propertyType')) {
      matchResult = 'PARTIAL_MATCH';
    }

    logger.info(`[PropertyMatchingService] Score: ${score}/100, MatchResult: ${matchResult}, Mismatches: [${mismatchFields.join(', ')}]`);

    return {
      confidenceScore: Math.min(100, Math.max(0, score)),
      matchResult,
      mismatchFields,
      matchedFields,
    };
  }

  fuzzyMatch(str1, str2) {
    if (!str1 || !str2) return false;
    const parts1 = str1.split(/\s+/);
    const parts2 = str2.split(/\s+/);
    return parts1.some(p => p.length > 2 && parts2.includes(p));
  }
}

export default new PropertyMatchingService();
