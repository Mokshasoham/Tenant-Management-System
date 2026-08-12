import crypto from 'crypto';

export class EvidenceSynthesisEngine {
  /**
   * Calculate Jaro-Winkler similarity between two strings
   */
  calculateSimilarity(str1 = '', str2 = '') {
    const s1 = (str1 || '').toUpperCase().trim();
    const s2 = (str2 || '').toUpperCase().trim();
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 100;

    const len1 = s1.length;
    const len2 = s2.length;
    const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;

    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);

    let matches = 0;
    let transpositions = 0;

    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchDistance);
      const end = Math.min(i + matchDistance + 1, len2);

      for (let j = start; j < end; j++) {
        if (s2Matches[j]) continue;
        if (s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0;

    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }

    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
    let prefix = 0;
    for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }

    const jaroWinkler = jaro + prefix * 0.1 * (1 - jaro);
    return Math.round(jaroWinkler * 100);
  }

  /**
   * Generate SHA-256 evidence fingerprint for a given snapshot
   */
  generateFingerprint(data) {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Evaluate the 18-rule cross-engine conflict matrix across verification sub-documents
   */
  evaluateConflicts(verification) {
    const conflicts = [];
    const idVer = verification.identityVerification || {};
    const propVer = verification.propertyVerification || {};
    const digiVer = verification.digiLockerVerification || verification.digilocker || {};
    const faceVer = verification.facialVerification || {};
    const vkycVer = verification.videoKycVerification || {};
    const fraudVer = verification.fraudDetection || {};
    const sancVer = verification.sanctionScreening || {};

    const now = new Date();
    const NinetyDaysMs = 90 * 24 * 60 * 60 * 1000;

    // Rule 1: Identity vs Property Name Mismatch
    if (idVer.verificationStatus === 'VERIFIED' && propVer.verificationStatus === 'VERIFIED') {
      const idName = verification.applicantName || idVer.name || '';
      const propOwnerName = propVer.ownerName || propVer.matchedOwnerName || '';
      if (idName && propOwnerName) {
        const similarity = this.calculateSimilarity(idName, propOwnerName);
        if (similarity < 70) {
          conflicts.push({
            conflictCode: 'CRF_NAME_PROP_MISMATCH',
            severity: 'HIGH',
            enginesInvolved: ['identityVerification', 'propertyVerification'],
            description: `Identity name '${idName}' and land registry owner name '${propOwnerName}' mismatch (similarity: ${similarity}%)`,
            scoreImpact: 15,
          });
        }
      }
    }

    // Rule 2: Identity DOB vs DigiLocker DOB Mismatch
    const idDob = idVer.dob || verification.applicantDob;
    const digiDob = digiVer.dob || digiVer.importedDocumentDetails?.dob;
    if (idDob && digiDob && idDob !== digiDob) {
      conflicts.push({
        conflictCode: 'CRF_DOB_DIGI_MISMATCH',
        severity: 'HIGH',
        enginesInvolved: ['identityVerification', 'digiLockerVerification'],
        description: `Identity Date of Birth (${idDob}) mismatches DigiLocker record Date of Birth (${digiDob})`,
        scoreImpact: 20,
      });
    }

    // Rule 3: Identity Document Number vs DigiLocker Mismatch
    const idDocNum = idVer.documentReference || idVer.maskedDocumentNumber;
    const digiDocNum = digiVer.importedDocumentDetails?.documentNumber;
    if (idDocNum && digiDocNum && idDocNum !== digiDocNum) {
      conflicts.push({
        conflictCode: 'CRF_DOC_NUM_MISMATCH',
        severity: 'CRITICAL',
        enginesInvolved: ['identityVerification', 'digiLockerVerification'],
        description: `Identity document reference (${idDocNum}) mismatches DigiLocker document reference (${digiDocNum})`,
        scoreImpact: 30,
      });
    }

    // Rule 4: Facial 1:1 Match Failure
    if (faceVer.verificationStatus === 'FAILED' || (faceVer.matchScore > 0 && faceVer.matchScore < 70)) {
      conflicts.push({
        conflictCode: 'CRF_FACIAL_MATCH_FAIL',
        severity: 'CRITICAL',
        enginesInvolved: ['facialVerification'],
        description: `Facial 1:1 biometric match score below 70% (Score: ${faceVer.matchScore || 0}%)`,
        scoreImpact: 35,
      });
    }

    // Rule 5: Facial Liveness Passed but Video KYC Spoofing / Agent Check Failed
    if (faceVer.livenessResult === 'PASSED' && (vkycVer.verificationStatus === 'FAILED' || vkycVer.evaluationResult === 'REJECTED')) {
      conflicts.push({
        conflictCode: 'CRF_FACE_VKYC_MISMATCH',
        severity: 'CRITICAL',
        enginesInvolved: ['facialVerification', 'videoKycVerification'],
        description: 'Passive facial liveness PASSED but Video KYC agent evaluation or liveness check FAILED',
        scoreImpact: 30,
      });
    }

    // Rule 6: DigiLocker Provenance or Tamper Check Failure
    if (digiVer.verificationStatus === 'FAILED' || digiVer.tamperCheckResult === 'TAMPERED') {
      conflicts.push({
        conflictCode: 'CRF_DIGI_PROV_FAIL',
        severity: 'HIGH',
        enginesInvolved: ['digiLockerVerification'],
        description: 'DigiLocker PKCE issuer token validation or document tamper-evident verification FAILED',
        scoreImpact: 20,
      });
    }

    // Rule 7 & 8: Fraud Detection Penalties
    const fraudScore = fraudVer.riskScore || 0;
    if (fraudScore >= 75) {
      conflicts.push({
        conflictCode: 'CRF_FRAUD_CRITICAL_RISK',
        severity: 'CRITICAL',
        enginesInvolved: ['fraudDetection'],
        description: `Fraud Risk Engine detected CRITICAL_RISK (Risk Score: ${fraudScore})`,
        scoreImpact: 50,
      });
    } else if (fraudScore >= 50) {
      conflicts.push({
        conflictCode: 'CRF_FRAUD_HIGH_RISK',
        severity: 'HIGH',
        enginesInvolved: ['fraudDetection'],
        description: `Fraud Risk Engine detected HIGH_RISK (Risk Score: ${fraudScore})`,
        scoreImpact: 30,
      });
    }

    // Rule 9: Confirmed Sanction Match
    if (sancVer.matchStatus === 'CONFIRMED_MATCH') {
      conflicts.push({
        conflictCode: 'CRF_SANCTION_CONFIRMED',
        severity: 'CRITICAL',
        enginesInvolved: ['sanctionScreening'],
        description: 'Confirmed Sanctions Watchlist match detected (Human confirmed OFAC/UN/EU SDN)',
        scoreImpact: 100,
      });
    }

    // Rules 10-15: Sanction Watchlist Match Types & Adverse Media
    if (sancVer.matches && sancVer.matches.length > 0) {
      for (const m of sancVer.matches) {
        if (m.matchType === 'PEP_MATCH') {
          conflicts.push({
            conflictCode: 'CRF_PEP_DETECTED',
            severity: 'MEDIUM',
            enginesInvolved: ['sanctionScreening'],
            description: `Politically Exposed Person (PEP) candidate match detected (${m.matchedName})`,
            scoreImpact: 10,
          });
        } else if (m.matchType === 'RCA_MATCH') {
          conflicts.push({
            conflictCode: 'CRF_RCA_DETECTED',
            severity: 'LOW',
            enginesInvolved: ['sanctionScreening'],
            description: `Relative or Close Associate (RCA) match detected (${m.matchedName})`,
            scoreImpact: 5,
          });
        } else if (m.matchType === 'ADVERSE_MEDIA_MATCH') {
          const cls = m.adverseMediaDetails?.classification || 'ALLEGATION';
          if (cls === 'CONVICTION') {
            conflicts.push({
              conflictCode: 'CRF_ADV_CONVICTION',
              severity: 'CRITICAL',
              enginesInvolved: ['sanctionScreening'],
              description: `Adverse media conviction match detected (${m.matchedName})`,
              scoreImpact: 40,
            });
          } else if (cls === 'INVESTIGATION' || cls === 'CHARGE') {
            conflicts.push({
              conflictCode: 'CRF_ADV_INVESTIGATION',
              severity: 'MEDIUM',
              enginesInvolved: ['sanctionScreening'],
              description: `Adverse media investigation/charge match detected (${m.matchedName})`,
              scoreImpact: 15,
            });
          } else {
            conflicts.push({
              conflictCode: 'CRF_ADV_ALLEGATION',
              severity: 'LOW',
              enginesInvolved: ['sanctionScreening'],
              description: `Adverse media allegation match detected (${m.matchedName})`,
              scoreImpact: 5,
            });
          }
        } else if (m.matchType === 'ENFORCEMENT_MATCH') {
          conflicts.push({
            conflictCode: 'CRF_ENFORCEMENT_MATCH',
            severity: 'HIGH',
            enginesInvolved: ['sanctionScreening'],
            description: `Regulatory enforcement action match detected (${m.matchedName})`,
            scoreImpact: 30,
          });
        }
      }
    }

    // Rule 16: Provider Error / Timeout
    const providers = [idVer, propVer, digiVer, faceVer, vkycVer, fraudVer, sancVer];
    const unavailableFound = providers.some(
      (p) => p.verificationStatus === 'UNAVAILABLE' || p.scanStatus === 'FAILED' || p.providerStatus === 'UNAVAILABLE'
    );
    if (unavailableFound) {
      conflicts.push({
        conflictCode: 'CRF_PROVIDER_UNAVAILABLE',
        severity: 'MEDIUM',
        enginesInvolved: ['externalProviders'],
        description: 'One or more verification engine providers experienced an error or timeout',
        scoreImpact: 10,
      });
    }

    // Rule 17: Stale Evidence (> 90 days)
    const evaluatedDates = [idVer.verifiedAt, propVer.verifiedAt, faceVer.verifiedAt, vkycVer.evaluatedAt, fraudVer.evaluatedAt, sancVer.scannedAt]
      .filter(Boolean)
      .map((d) => new Date(d).getTime());
    if (evaluatedDates.length > 0) {
      const oldestMs = Math.min(...evaluatedDates);
      if (now.getTime() - oldestMs > NinetyDaysMs) {
        conflicts.push({
          conflictCode: 'CRF_STALE_EVIDENCE',
          severity: 'LOW',
          enginesInvolved: ['synthesisEngine'],
          description: 'One or more evidence snapshots were evaluated > 90 days ago',
          scoreImpact: 5,
        });
      }
    }

    // Rule 18: Contradictory Results (High Identity Score + Critical Risk)
    if (idVer.confidenceScore >= 90 && (fraudScore >= 75 || sancVer.matchStatus === 'CONFIRMED_MATCH')) {
      conflicts.push({
        conflictCode: 'CRF_CONTRADICTORY_RESULTS',
        severity: 'CRITICAL',
        enginesInvolved: ['identityVerification', 'fraudDetection', 'sanctionScreening'],
        description: 'Contradictory result: High identity confidence alongside Critical Fraud/Sanction risk',
        scoreImpact: 40,
      });
    }

    return conflicts;
  }

  /**
   * Execute synthesis calculation and compute Unified Verification Score (UVS)
   */
  synthesize(verification) {
    const idVer = verification.identityVerification || {};
    const propVer = verification.propertyVerification || {};
    const digiVer = verification.digiLockerVerification || verification.digilocker || {};
    const faceVer = verification.facialVerification || {};
    const vkycVer = verification.videoKycVerification || {};
    const fraudVer = verification.fraudDetection || {};
    const sancVer = verification.sanctionScreening || {};

    const activeEngines = [];
    let activePositiveWeights = 0;
    let accumulatedPositivePoints = 0;

    // Helper to evaluate positive engine
    const checkPositiveEngine = (engineName, doc, weight) => {
      const status = doc.verificationStatus || doc.status || 'NOT_EVALUATED';
      if (['EVALUATED', 'VERIFIED', 'COMPLETED', 'PASSED'].includes(status)) {
        const conf = doc.confidenceScore ?? doc.matchScore ?? 100;
        activeEngines.push(engineName);
        activePositiveWeights += weight;
        accumulatedPositivePoints += (conf / 100.0) * weight;
        return conf;
      }
      return 0;
    };

    const identityScore = checkPositiveEngine('identityVerification', idVer, 25);
    const propertyScore = checkPositiveEngine('propertyVerification', propVer, 20);
    const digilockerScore = checkPositiveEngine('digiLockerVerification', digiVer, 15);
    const facialScore = checkPositiveEngine('facialVerification', faceVer, 15);
    const videoKycScore = checkPositiveEngine('videoKycVerification', vkycVer, 10);

    // Step 1: Base Positive Evidence (85-point scale)
    let positiveEvidenceScore85 = 0;
    if (activePositiveWeights > 0) {
      const normalizingFactor = 85.0 / activePositiveWeights;
      positiveEvidenceScore85 = accumulatedPositivePoints * normalizingFactor;
    }

    // Step 2: Scale Positive Evidence to 100-Point Base
    const positiveEvidenceScore100 = (positiveEvidenceScore85 / 85.0) * 100.0;

    // Step 3: Calculate Risk Penalties (100-point scale)
    const fraudRiskScore = fraudVer.riskScore || 0;
    const fraudPenalty = (fraudRiskScore / 100.0) * 10.0;

    let sanctionPenalty = 0;
    if (sancVer.matchStatus === 'CONFIRMED_MATCH') {
      sanctionPenalty = 15.0;
    } else if (sancVer.matchStatus === 'POTENTIAL_MATCH') {
      sanctionPenalty = ((sancVer.highestMatchScore || 0) / 100.0) * 15.0;
    }

    const totalRiskPenalty = Math.min(25.0, fraudPenalty + sanctionPenalty);

    // Step 4: Evaluate Conflict Matrix
    const conflicts = this.evaluateConflicts(verification);
    const conflictPenalty = conflicts.reduce((sum, c) => sum + c.scoreImpact, 0);

    // Step 5: Raw UVS Calculation
    const rawUVS = positiveEvidenceScore100 - totalRiskPenalty - conflictPenalty;

    // Step 6: Rounding and Clamping
    const finalUVS = Math.min(100, Math.max(0, Math.round(rawUVS * 100) / 100));

    // Determine synthesis status
    let synthesisStatus = 'EVALUATED';
    const isRiskUnavailable = fraudVer.riskLevel === 'UNAVAILABLE' || sancVer.matchStatus === 'UNAVAILABLE';
    const isPartial = activeEngines.length < 5;

    if (isRiskUnavailable) {
      synthesisStatus = 'UNAVAILABLE';
    } else if (conflicts.length > 0) {
      synthesisStatus = 'CONFLICT_DETECTED';
    } else if (isPartial) {
      synthesisStatus = 'PARTIAL_EVIDENCE';
    }

    // Determine Recommendation
    let recommendation = 'RECOMMEND_APPROVE';

    const hasCriticalSanction = sancVer.matchStatus === 'CONFIRMED_MATCH';
    const hasCriticalConflict = conflicts.some((c) => c.severity === 'CRITICAL');
    const hasHighMediumConflict = conflicts.some((c) => c.severity === 'HIGH' || c.severity === 'MEDIUM');

    if (hasCriticalSanction) {
      recommendation = 'CRITICAL_BLOCK';
    } else if (hasCriticalConflict || finalUVS < 40) {
      recommendation = 'RECOMMEND_REJECT';
    } else if (hasHighMediumConflict || finalUVS < 75 || isRiskUnavailable || isPartial) {
      recommendation = 'RECOMMEND_MANUAL_REVIEW';
    } else if (activeEngines.length === 5 && finalUVS >= 85) {
      recommendation = 'AUTO_APPROVE';
    }

    // Build source snapshots
    const sourceSnapshots = {
      identity: {
        engineVersion: idVer.engineVersion || 'v1.0',
        policyVersion: idVer.policyVersion || 'v1.0',
        evaluatedAt: idVer.verifiedAt || null,
        evidenceFingerprint: idVer.encryptedDocumentReference || '',
        status: idVer.verificationStatus || 'NOT_STARTED',
        confidenceScore: identityScore,
      },
      property: {
        engineVersion: propVer.engineVersion || 'v1.0',
        policyVersion: propVer.policyVersion || 'v1.0',
        evaluatedAt: propVer.verifiedAt || null,
        evidenceFingerprint: propVer.encryptedDocumentReference || '',
        status: propVer.verificationStatus || 'NOT_STARTED',
        confidenceScore: propertyScore,
      },
      digilocker: {
        engineVersion: digiVer.engineVersion || 'v1.0',
        policyVersion: digiVer.policyVersion || 'v1.0',
        evaluatedAt: digiVer.importedAt || null,
        evidenceFingerprint: digiVer.importedDocumentDetails?.documentNumber || '',
        status: digiVer.verificationStatus || 'NOT_STARTED',
      },
      facial: {
        engineVersion: faceVer.engineVersion || 'v1.0',
        policyVersion: faceVer.policyVersion || 'v1.0',
        evaluatedAt: faceVer.verifiedAt || null,
        evidenceFingerprint: faceVer.vectorRef || '',
        status: faceVer.verificationStatus || 'NOT_STARTED',
        matchScore: facialScore,
      },
      videoKyc: {
        engineVersion: vkycVer.engineVersion || 'v1.0',
        policyVersion: vkycVer.policyVersion || 'v1.0',
        evaluatedAt: vkycVer.evaluatedAt || null,
        evidenceFingerprint: vkycVer.sessionId || '',
        status: vkycVer.verificationStatus || 'NOT_STARTED',
      },
      fraud: {
        engineVersion: fraudVer.engineVersion || 'v1.0',
        policyVersion: fraudVer.policyVersion || 'v1.0',
        evaluatedAt: fraudVer.riskEvaluatedAt || null,
        evidenceFingerprint: fraudVer.scanId || '',
        riskScore: fraudRiskScore,
        riskLevel: fraudVer.riskLevel || 'NOT_EVALUATED',
      },
      sanctions: {
        engineVersion: sancVer.engineVersion || 'v1.0',
        policyVersion: sancVer.listPolicyVersion || 'v1.0',
        evaluatedAt: sancVer.scannedAt || null,
        evidenceFingerprint: sancVer.scanId || '',
        matchStatus: sancVer.matchStatus || 'NOT_EVALUATED',
        highestMatchScore: sancVer.highestMatchScore || 0,
      },
    };

    // Calculate composite synthesis fingerprint
    const fpString = Object.values(sourceSnapshots)
      .map((s) => `${s.status}:${s.evidenceFingerprint}:${s.confidenceScore || s.riskScore || 0}`)
      .join('|');
    const synthesisFingerprint = this.generateFingerprint(fpString);

    return {
      unifiedScore: finalUVS,
      synthesisStatus,
      recommendation,
      conflicts,
      sourceSnapshots,
      synthesisFingerprint,
      engineScores: {
        identityScore,
        propertyScore,
        digilockerScore,
        facialScore,
        videoKycScore,
        fraudPenalty: Math.round(fraudPenalty * 100) / 100,
        sanctionPenalty: Math.round(sanctionPenalty * 100) / 100,
      },
    };
  }
}

export default new EvidenceSynthesisEngine();
