import crypto from 'crypto';
import logger from '../platform/logging/logger.js';

export class FraudSignalService {
  /**
   * Generates a deterministic SHA-256 fingerprint for signal deduplication
   */
  generateFingerprint(signalCode, evidenceRef, source) {
    const raw = `${signalCode}:${evidenceRef || ''}:${source || ''}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Extracts fingerprinted signals from verification record and evidence sources
   * @param {object} verification - Complete Verification Mongoose document
   * @returns {Array} List of normalized fingerprinted signal objects
   */
  async extractSignals(verification) {
    const signals = [];

    if (!verification) {
      return signals;
    }

    // 1. Phase 3.6.1 Identity Signals
    if (verification.identityVerification) {
      const idVer = verification.identityVerification;
      if (idVer.verificationStatus === 'REJECTED' || idVer.lockStatus === 'LOCKED') {
        const ref = idVer.maskedDocumentNumber || idVer.documentType || 'IDENTITY';
        const fp = this.generateFingerprint('SIG_ID_LOCK_EXCEEDED', ref, 'Phase3.6.1');
        signals.push({
          signalFingerprint: fp,
          signalCode: 'SIG_ID_LOCK_EXCEEDED',
          category: 'IDENTITY',
          severity: 'HIGH',
          scoreImpact: 30,
          confidence: 100,
          description: 'Identity verification attempts locked due to excessive failures',
          evidenceRef: ref,
          detectedAt: new Date(),
        });
      }
    }

    // 2. Phase 3.6.2 Property Signals
    if (verification.propertyVerification) {
      const propVer = verification.propertyVerification;
      if (propVer.verificationStatus === 'REJECTED' || propVer.lockStatus === 'LOCKED') {
        const ref = propVer.propertyId ? propVer.propertyId.toString() : 'PROPERTY';
        const fp = this.generateFingerprint('SIG_PROP_OWNERSHIP_MISMATCH', ref, 'Phase3.6.2');
        signals.push({
          signalFingerprint: fp,
          signalCode: 'SIG_PROP_OWNERSHIP_MISMATCH',
          category: 'PROPERTY',
          severity: 'HIGH',
          scoreImpact: 25,
          confidence: 90,
          description: 'Property deed ownership record failed verification or survey match',
          evidenceRef: ref,
          detectedAt: new Date(),
        });
      }
    }

    // 3. Phase 3.6.3 DigiLocker Signals
    if (verification.digilocker) {
      const dl = verification.digilocker;
      if (dl.connectionStatus === 'REVOKED' || dl.connectionStatus === 'EXPIRED') {
        const ref = dl.digilockerId || 'DIGILOCKER';
        const fp = this.generateFingerprint('SIG_DIGILOCKER_UNAUTHENTICATED', ref, 'Phase3.6.3');
        signals.push({
          signalFingerprint: fp,
          signalCode: 'SIG_DIGILOCKER_UNAUTHENTICATED',
          category: 'DIGILOCKER',
          severity: 'MEDIUM',
          scoreImpact: 15,
          confidence: 85,
          description: 'DigiLocker token was revoked or disconnected during verification',
          evidenceRef: ref,
          detectedAt: new Date(),
        });
      }
    }

    // 4. Phase 3.6.4 Facial Biometric Signals
    if (verification.facialVerification) {
      const face = verification.facialVerification;
      if (face.livenessResult === 'FLAGGED_SPOOF' || face.livenessResult === 'FAILED') {
        const ref = face.providerRequestId || 'FACIAL_LIVENESS';
        const fp = this.generateFingerprint('SIG_FACIAL_SPOOF_DETECTED', ref, 'Phase3.6.4');
        signals.push({
          signalFingerprint: fp,
          signalCode: 'SIG_FACIAL_SPOOF_DETECTED',
          category: 'FACIAL',
          severity: 'CRITICAL',
          scoreImpact: 45,
          confidence: 95,
          description: 'Facial anti-spoofing liveness check detected presentation attack or spoofing attempt',
          evidenceRef: ref,
          detectedAt: new Date(),
        });
      }
      if (face.faceMatchResult === 'MISMATCH') {
        const ref = face.providerRequestId || 'FACIAL_MATCH';
        const fp = this.generateFingerprint('SIG_FACIAL_MATCH_LOW', ref, 'Phase3.6.4');
        signals.push({
          signalFingerprint: fp,
          signalCode: 'SIG_FACIAL_MATCH_LOW',
          category: 'FACIAL',
          severity: 'HIGH',
          scoreImpact: 35,
          confidence: 90,
          description: 'Facial biometric comparison score fell below match threshold',
          evidenceRef: ref,
          detectedAt: new Date(),
        });
      }
    }

    // 5. Phase 3.6.5 Video KYC Signals
    if (verification.videoKycVerification) {
      const vkyc = verification.videoKycVerification;
      if (vkyc.livenessCheckResult === 'FLAGGED_SPOOF' || vkyc.livenessCheckResult === 'FAILED') {
        const ref = vkyc.sessionId || 'VIDEO_KYC_SPOOF';
        const fp = this.generateFingerprint('SIG_VIDEO_KYC_SPOOF_DETECTED', ref, 'Phase3.6.5');
        signals.push({
          signalFingerprint: fp,
          signalCode: 'SIG_VIDEO_KYC_SPOOF_DETECTED',
          category: 'VIDEO_KYC',
          severity: 'CRITICAL',
          scoreImpact: 45,
          confidence: 95,
          description: 'Video KYC live agent interaction detected synthetic video or liveness anomaly',
          evidenceRef: ref,
          detectedAt: new Date(),
        });
      }
      if (vkyc.geolocation && vkyc.geolocation.isIpLocationMatched === false) {
        const ref = vkyc.sessionId || 'VIDEO_KYC_GEO';
        const fp = this.generateFingerprint('SIG_VIDEO_KYC_GEO_IP_MISMATCH', ref, 'Phase3.6.5');
        signals.push({
          signalFingerprint: fp,
          signalCode: 'SIG_VIDEO_KYC_GEO_IP_MISMATCH',
          category: 'VIDEO_KYC',
          severity: 'LOW',
          scoreImpact: 10,
          confidence: 70,
          description: 'Device geolocation latitude/longitude mismatched server IP geolocation range',
          evidenceRef: ref,
          detectedAt: new Date(),
        });
      }
    }

    // 6. Cross-Account Document Hash Reuse Signal (Privacy-Preserving)
    if (verification.documents && Array.isArray(verification.documents)) {
      for (const doc of verification.documents) {
        if (doc.documentHash && doc.isDuplicateHash) {
          const anonymizedRef = `DOC-HASH-MATCH-${doc.documentHash.substring(0, 8)}`;
          const fp = this.generateFingerprint('SIG_DOC_HASH_DUPLICATE', anonymizedRef, 'System');
          signals.push({
            signalFingerprint: fp,
            signalCode: 'SIG_DOC_HASH_DUPLICATE',
            category: 'IDENTITY',
            severity: 'CRITICAL',
            scoreImpact: 40,
            confidence: 100,
            description: 'Uploaded document cryptographic hash matches an existing registered user document',
            evidenceRef: anonymizedRef,
            detectedAt: new Date(),
          });
        }
      }
    }

    // 7. Phase 3.6.7 Sanctions & PEP Signals
    if (verification.sanctionScreening) {
      const sanc = verification.sanctionScreening;
      if (sanc.matchStatus === 'CONFIRMED_MATCH') {
        const ref = sanc.matches?.[0]?.anonymizedReference || 'SANCTION_CONFIRMED';
        const fp = this.generateFingerprint('SIG_SANCTION_MATCH_CONFIRMED', ref, 'Phase3.6.7');
        signals.push({
          signalFingerprint: fp,
          signalCode: 'SIG_SANCTION_MATCH_CONFIRMED',
          category: 'IDENTITY',
          severity: 'CRITICAL',
          scoreImpact: 50,
          confidence: 100,
          description: 'Official global sanctions or watchlist match confirmed by compliance officer',
          evidenceRef: ref,
          detectedAt: new Date(),
        });
      } else if (sanc.matches && Array.isArray(sanc.matches)) {
        for (const match of sanc.matches) {
          if (match.matchType === 'PEP_MATCH') {
            const ref = match.anonymizedReference || 'PEP_MATCH';
            const fp = this.generateFingerprint('SIG_PEP_MATCH_DETECTED', ref, 'Phase3.6.7');
            signals.push({
              signalFingerprint: fp,
              signalCode: 'SIG_PEP_MATCH_DETECTED',
              category: 'IDENTITY',
              severity: 'MEDIUM',
              scoreImpact: 15,
              confidence: 85,
              description: 'Politically Exposed Person (PEP) designation detected during watchlist screening',
              evidenceRef: ref,
              detectedAt: new Date(),
            });
          }
        }
      }
    }

    // 7. Phase 3.6.8 Multi-Engine Evidence Fusion Signals
    if (verification.evidenceFusion) {
      const fusion = verification.evidenceFusion;
      if (fusion.conflicts && fusion.conflicts.length > 0) {
        const fp = this.generateFingerprint('SIG_FUSION_CONFLICT_DETECTED', fusion.synthesisId || 'FUSION_CONFLICT', 'Phase3.6.8');
        signals.push({
          signalFingerprint: fp,
          signalCode: 'SIG_FUSION_CONFLICT_DETECTED',
          category: 'BEHAVIORAL',
          severity: fusion.conflicts.some((c) => c.severity === 'CRITICAL') ? 'CRITICAL' : 'HIGH',
          scoreImpact: 25,
          confidence: 90,
          description: `Multi-Engine Evidence Fusion detected ${fusion.conflicts.length} cross-engine discrepancies`,
          evidenceRef: fusion.synthesisId || 'FUSION_CONFLICT',
          detectedAt: new Date(),
        });
      }
    }

    logger.debug(`[FraudSignalService] Extracted ${signals.length} signals for verification ${verification._id}`);
    return signals;
  }

  async extractSanctionSignals(verificationId) {
    return this.extractSignals(verificationId);
  }
}

export default new FraudSignalService();
