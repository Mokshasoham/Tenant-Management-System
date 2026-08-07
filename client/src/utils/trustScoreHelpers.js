import { BADGE_TIER_CONFIG } from '../constants/verification/badges';

export const getTrustBadgeTier = (score = 0) => {
  if (score >= 95) return BADGE_TIER_CONFIG.PLATINUM;
  if (score >= 85) return BADGE_TIER_CONFIG.GOLD;
  if (score >= 70) return BADGE_TIER_CONFIG.SILVER;
  if (score >= 50) return BADGE_TIER_CONFIG.BRONZE;
  return BADGE_TIER_CONFIG.UNVERIFIED;
};

export const formatScoreBreakdown = (breakdown = {}) => {
  return [
    { label: 'Identity Proof', score: breakdown.identity || 0, max: 30, color: 'emerald' },
    { label: 'Phone & Email', score: breakdown.phone || 0, max: 15, color: 'blue' },
    { label: 'Business / Employment', score: breakdown.business || 0, max: 20, color: 'violet' },
    { label: 'Property / Assets', score: breakdown.property || 0, max: 15, color: 'cyan' },
    { label: 'Platform History', score: breakdown.reviews || 0, max: 10, color: 'amber' },
    { label: 'Clean Fraud Status', score: breakdown.noFraud || 0, max: 10, color: 'emerald' },
  ];
};
