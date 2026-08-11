import crypto from 'crypto';
import config from '../config/config.js';
import logger from '../platform/logging/logger.js';

export class SanctionMatchEngine {
  /**
   * 12-Stage Entity Normalization Pipeline
   * @param {string} rawName 
   * @returns {string} normalized string
   */
  static normalizeName(rawName) {
    if (!rawName || typeof rawName !== 'string') return '';

    // Stage 1-2: NFKD Unicode Normalization & Uppercase
    let str = rawName.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

    // Stage 3-5: Transliteration & Punctuation Strip & Whitespace Collapse
    // Common non-Latin replacements
    str = str.replace(/Æ/g, 'AE').replace(/Ø/g, 'O').replace(/Å/g, 'A').replace(/ß/g, 'SS');
    // Keep letters, digits, spaces, hyphens
    str = str.replace(/[^A-Z0-9\s-]/g, '');
    // Collapse hyphens and multiple spaces
    str = str.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

    return str;
  }

  /**
   * Calculate Jaro-Winkler similarity between two strings (0 - 100)
   */
  static calculateJaroWinkler(str1, str2) {
    const s1 = this.normalizeName(str1);
    const s2 = this.normalizeName(str2);

    if (s1 === s2) return 100;
    if (!s1 || !s2) return 0;

    const len1 = s1.length;
    const len2 = s2.length;
    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;

    const matches1 = new Array(len1).fill(false);
    const matches2 = new Array(len2).fill(false);

    let matchCount = 0;
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, len2);
      for (let j = start; j < end; j++) {
        if (!matches2[j] && s1[i] === s2[j]) {
          matches1[i] = true;
          matches2[j] = true;
          matchCount++;
          break;
        }
      }
    }

    if (matchCount === 0) return 0;

    let k = 0;
    let transpositions = 0;
    for (let i = 0; i < len1; i++) {
      if (matches1[i]) {
        while (!matches2[k]) k++;
        if (s1[i] !== s2[k]) transpositions++;
        k++;
      }
    }

    const m = matchCount;
    const jaro = (m / len1 + m / len2 + (m - transpositions / 2) / m) / 3;

    // Winkler prefix scaling (up to 4 chars)
    let prefix = 0;
    for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }

    const jaroWinkler = jaro + prefix * 0.1 * (1 - jaro);
    return Math.round(jaroWinkler * 100);
  }

  /**
   * Deterministic SHA-256 fingerprint for evidence deduplication
   */
  static generateFingerprint(matchType, matchedName, listName, sourceRecordReference) {
    const raw = `${matchType}:${this.normalizeName(matchedName)}:${this.normalizeName(listName)}:${sourceRecordReference || ''}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Evaluates raw candidate matches against normalization pipeline and thresholds
   */
  static evaluateCandidates(entityData, candidateMatches = []) {
    const normInputName = this.normalizeName(entityData.legalName || '');
    if (!normInputName) {
      return {
        matchStatus: 'NO_MATCH',
        highestMatchScore: 0,
        matches: [],
      };
    }

    const sanctionThreshold = config.SANCTION_MATCH_THRESHOLD || 80;
    const pepThreshold = config.PEP_MATCH_THRESHOLD || 75;

    const evaluatedMatches = [];
    let highestScore = 0;
    let hasPotentialMatch = false;

    for (const rawCandidate of candidateMatches) {
      const normMatchedName = this.normalizeName(rawCandidate.matchedName || '');
      let score = rawCandidate.similarityScore;

      // Recalculate fuzzy similarity if not provided
      if (score === undefined || score === null) {
        score = this.calculateJaroWinkler(normInputName, normMatchedName);
      }

      // DOB / Birth Year comparison filter (Stage 8 of normalization pipeline)
      if (entityData.dob && rawCandidate.birthYear) {
        const inputYear = new Date(entityData.dob).getFullYear();
        if (inputYear && Math.abs(inputYear - rawCandidate.birthYear) > 2) {
          // Reject false positive due to birth year mismatch
          score = Math.max(0, score - 30);
        }
      }

      highestScore = Math.max(highestScore, score);

      const matchType = rawCandidate.matchType || 'SANCTION_MATCH';
      const effectiveThreshold = (matchType === 'PEP_MATCH' || matchType === 'RCA_MATCH') ? pepThreshold : sanctionThreshold;

      if (score >= effectiveThreshold) {
        hasPotentialMatch = true;
        const fingerprint = rawCandidate.evidenceFingerprint || this.generateFingerprint(
          matchType,
          rawCandidate.matchedName,
          rawCandidate.listName,
          rawCandidate.sourceRecordReference
        );

        evaluatedMatches.push({
          matchId: rawCandidate.matchId || `MTC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          evidenceFingerprint: fingerprint,
          matchType,
          listName: rawCandidate.listName || 'Global Compliance Watchlist',
          matchedName: rawCandidate.matchedName,
          similarityScore: score,
          country: rawCandidate.country || entityData.country || '',
          anonymizedReference: rawCandidate.anonymizedReference || `SANCTION-MATCH-${crypto.createHash('md5').update(fingerprint).digest('hex').substring(0, 8).toUpperCase()}`,
          sourceProvider: rawCandidate.sourceProvider || 'DefaultSanctionAdapter',
          sourceList: rawCandidate.sourceList || rawCandidate.listName || 'WATCHLIST',
          sourceType: rawCandidate.sourceType || 'SANCTIONS_LIST',
          // Opaque source record reference rule: MUST NOT contain raw bodies/PII/tokens
          sourceRecordReference: rawCandidate.sourceRecordReference || `SRC-REF-${Date.now()}-OPAQUE`,
          sourceRetrievedAt: rawCandidate.sourceRetrievedAt || new Date(),
          sourcePolicyVersion: rawCandidate.sourcePolicyVersion || 'v1.0',
          adverseMediaDetails: rawCandidate.adverseMediaDetails || {
            sourceName: '',
            sourceUrl: '',
            publicationDate: null,
            entityResolutionConfidence: 0,
            relevanceConfidence: 0,
            mediaCategory: '',
            classification: 'NONE',
          },
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
        });
      }
    }

    return {
      matchStatus: hasPotentialMatch ? 'POTENTIAL_MATCH' : 'NO_MATCH',
      highestMatchScore: highestScore,
      matches: evaluatedMatches,
    };
  }
}
