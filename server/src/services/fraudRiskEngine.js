import config from '../config/config.js';
import logger from '../platform/logging/logger.js';

export class FraudRiskEngine {
  constructor() {
    this.categoryCaps = {
      IDENTITY: 35,
      PROPERTY: 35,
      DIGILOCKER: 20,
      FACIAL: 40,
      VIDEO_KYC: 45,
      SYSTEM: 20,
    };
  }

  /**
   * Calculates composite risk score and risk level from extracted signals
   * @param {Array} signals - List of fingerprinted signal objects
   * @param {object} customThresholds - Optional threshold overrides for testing
   * @returns {object} { riskScore, riskLevel, decision, explanations }
   */
  calculateRisk(signals = [], customThresholds = null) {
    const lowMax = customThresholds?.FRAUD_LOW_RISK_MAX ?? config.FRAUD_LOW_RISK_MAX;
    const medMax = customThresholds?.FRAUD_MEDIUM_RISK_MAX ?? config.FRAUD_MEDIUM_RISK_MAX;
    const highMax = customThresholds?.FRAUD_HIGH_RISK_MAX ?? config.FRAUD_HIGH_RISK_MAX;
    const critMin = customThresholds?.FRAUD_CRITICAL_RISK_MIN ?? config.FRAUD_CRITICAL_RISK_MIN;

    // Step 1 & 3: Deduplicate signals by fingerprint
    const uniqueSignalsMap = new Map();
    for (const sig of signals) {
      if (sig.signalFingerprint && !uniqueSignalsMap.has(sig.signalFingerprint)) {
        uniqueSignalsMap.set(sig.signalFingerprint, sig);
      }
    }
    const uniqueSignals = Array.from(uniqueSignalsMap.values());

    // Step 2 & 4: Group by category and apply category caps
    const categoryTotals = {};
    for (const sig of uniqueSignals) {
      const cat = sig.category || 'SYSTEM';
      const impact = (sig.scoreImpact || 0) * ((sig.confidence ?? 100) / 100);
      categoryTotals[cat] = (categoryTotals[cat] || 0) + impact;
    }

    let rawScore = 0;
    for (const [cat, total] of Object.entries(categoryTotals)) {
      const cap = this.categoryCaps[cat] || 30;
      rawScore += Math.min(total, cap);
    }

    // Step 5: Clamp score between 0 and 100
    const riskScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    // Step 6: Risk Tier Assignment & Decision Mapping
    let riskLevel = 'LOW_RISK';
    let decision = 'PASSED';

    if (riskScore <= lowMax) {
      riskLevel = 'LOW_RISK';
      decision = 'PASSED';
    } else if (riskScore <= medMax) {
      riskLevel = 'MEDIUM_RISK';
      decision = 'PASSED';
    } else if (riskScore <= highMax) {
      riskLevel = 'HIGH_RISK';
      decision = 'REVIEW_REQUIRED';
    } else {
      riskLevel = 'CRITICAL_RISK';
      decision = 'REVIEW_REQUIRED'; // Human decision required before FRAUD_CONFIRMED
    }

    // Step 7: Structured Explanations
    const explanations = uniqueSignals.map((s) => ({
      ruleCode: s.signalCode,
      summary: s.description,
      recommendation:
        s.severity === 'CRITICAL' || s.severity === 'HIGH'
          ? 'Requires urgent manual verification review'
          : 'Monitor user verification activities',
    }));

    logger.debug(`[FraudRiskEngine] Calculated risk score: ${riskScore}, riskLevel: ${riskLevel}, decision: ${decision}`);

    return {
      riskScore,
      riskLevel,
      decision,
      uniqueSignals,
      explanations,
    };
  }
}

export default new FraudRiskEngine();
