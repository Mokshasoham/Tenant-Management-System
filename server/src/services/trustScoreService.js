import verificationRepository from '../repositories/verificationRepository.js';
import User from '../models/User.js';
import Property from '../models/Property.js';
import logger from '../platform/logging/logger.js';
import eventBus from '../platform/events/eventBus.js';
import { EventTypes } from '../platform/events/eventTypes.js';

export class TrustScoreService {
  /**
   * Calculates score breakdown and total trust score for an entity based on workflow weights.
   *
   * @param {string} entityType - TENANT, MANAGER, PROPERTY, TECHNICIAN
   * @param {object} verification - Verification document
   * @param {object} entityDoc - User or Property document
   * @returns {object} { score, breakdown }
   */
  calculateScoreAndBreakdown(entityType, verification = {}, entityDoc = {}) {
    const vDoc = verification || {};
    const eDoc = entityDoc || {};
    const workflow = vDoc.workflowId || {};
    const weights = workflow.trustWeights || {
      identity: 30,
      phone: 15,
      business: 20,
      property: 10,
      reviews: 12,
      noFraud: 5,
      base: 8,
    };

    let identity = 0;
    let phone = 0;
    let business = 0;
    let property = 0;
    let reviews = 0;
    let noFraud = 0;
    let penalties = 0;

    // 1. Identity Component
    const docs = Array.isArray(vDoc.documents) ? vDoc.documents : [];
    const identityObj = vDoc.identityVerification || {};
    const hasVerifiedIdentity = docs.some(
      (d) => ['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'GOVT_ID'].includes(d.documentType) && d.reviewStatus === 'ACCEPTED'
    ) || eDoc.identityVerificationStatus === 'verified' || eDoc.isEmailVerified || identityObj.verificationStatus === 'VERIFIED';
    if (hasVerifiedIdentity) {
      const confidenceBonus = identityObj.confidenceScore ? Math.round((identityObj.confidenceScore / 100) * weights.identity) : weights.identity;
      identity = Math.max(weights.identity, confidenceBonus);
    }

    // 2. Phone Component
    if (eDoc.isPhoneVerified || eDoc.phoneVerificationStatus === 'verified') {
      phone = weights.phone;
    }

    // 3. Business Component
    const hasVerifiedBusiness = docs.some(
      (d) => ['GST_CERTIFICATE', 'COMPANY_REGISTRATION', 'BUSINESS_PAN'].includes(d.documentType) && d.reviewStatus === 'ACCEPTED'
    );
    if (hasVerifiedBusiness) {
      business = weights.business;
    }

    // 4. Property Component
    if (entityType === 'PROPERTY' && (vDoc.status === 'APPROVED' || eDoc.verificationStatus === 'verified')) {
      property = weights.property;
    } else if (eDoc.properties?.length > 0) {
      property = weights.property;
    }

    // 5. Reviews Component
    const rating = eDoc.rating || eDoc.technicianProfile?.rating || 5.0;
    if (rating >= 4.0) {
      reviews = Math.round((rating / 5.0) * weights.reviews);
    }

    // 6. No Fraud Component
    const riskScore = vDoc.riskScore || 0;
    const hasFlags = Object.values(vDoc.riskFlags || {}).some(Boolean);
    if (!hasFlags && riskScore < 20) {
      noFraud = weights.noFraud;
    }

    // 7. Penalties Component
    if (hasFlags) {
      penalties += 20;
    }
    if (riskScore >= 40) {
      penalties += 15;
    }

    const rawTotal = (weights.base || 0) + identity + phone + business + property + reviews + noFraud - penalties;
    const score = Math.max(0, Math.min(100, Math.round(rawTotal)));

    const breakdown = {
      identity,
      phone,
      business,
      property,
      reviews,
      noFraud,
      penalties,
    };

    return { score, breakdown };
  }

  /**
   * Evaluates trust score change, persists to TrustScoreHistory, updates User/Property cache.
   */
  async updateTrustScore({ entityType, entityId, verification = null, reason, triggeredBy = null, note = '' }) {
    try {
      let entityDoc = null;
      if (entityType === 'PROPERTY') {
        entityDoc = await Property.findById(entityId);
      } else {
        entityDoc = await User.findById(entityId);
      }

      if (!entityDoc) {
        logger.warn(`[TrustScoreService] Entity ${entityType}:${entityId} not found.`);
        return null;
      }

      const { score, breakdown } = this.calculateScoreAndBreakdown(entityType, verification, entityDoc);
      const latestHistory = await verificationRepository.findLatestTrustHistory(entityType, entityId);
      const previousScore = latestHistory ? latestHistory.score : 0;
      const delta = score - previousScore;

      const historyRecord = await verificationRepository.createTrustHistory({
        entityType,
        entityId,
        score,
        previousScore,
        delta,
        breakdown,
        reason,
        triggeredBy,
        verificationId: verification?._id || null,
        note,
      });

      const shouldAwardBadge = score >= 75 && (verification?.status === 'APPROVED' || entityDoc.verificationStatus === 'approved');

      // Update Entity cache & badge status
      if (entityType === 'PROPERTY') {
        await Property.findByIdAndUpdate(entityId, {
          $set: {
            verifiedBadge: shouldAwardBadge,
          },
        });
      } else {
        await User.findByIdAndUpdate(entityId, {
          $set: {
            currentTrustScore: score,
            verificationBadge: shouldAwardBadge,
          },
        });
      }

      // Publish domain event
      await eventBus.publish(EventTypes.VERIFICATION.TRUST_UPDATED, {
        entityType,
        entityId,
        score,
        previousScore,
        delta,
        badgeAwarded: shouldAwardBadge,
        reason,
      });

      logger.info(`[TrustScoreService] Updated trust score for ${entityType}:${entityId} -> ${score} (delta: ${delta})`);
      return historyRecord;
    } catch (err) {
      logger.error(`[TrustScoreService] Error updating trust score for ${entityType}:${entityId}:`, err);
      throw err;
    }
  }

  async getTrustHistory(entityType, entityId) {
    return await verificationRepository.findTrustHistoryByEntity(entityType, entityId);
  }

  async recalculateTrustScore(entityType, entityId, reason = 'RECALCULATE') {
    return await this.updateTrustScore({ entityType, entityId, reason });
  }
}

export default new TrustScoreService();
