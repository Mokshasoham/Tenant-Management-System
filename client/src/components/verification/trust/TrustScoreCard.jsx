import React from 'react';
import { ShieldCheck, Award } from 'lucide-react';
import VerificationSectionCard from '../common/VerificationSectionCard';
import CircularProgress from '../charts/CircularProgress';
import VerificationBadge from '../badges/VerificationBadge';
import { getTrustBadgeTier } from '../../../utils/trustScoreHelpers';

export const TrustScoreCard = ({ score = 0, badge = 'UNVERIFIED', className = '' }) => {
  const tier = getTrustBadgeTier(score);

  return (
    <VerificationSectionCard title="Trust Score & Badge" subtitle="Platform credibility rating" icon={Award} className={className}>
      <div className="flex items-center justify-between gap-6 py-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl font-black text-foreground">{score}</span>
            <span className="text-sm text-muted-foreground font-semibold">/ 100 pts</span>
          </div>
          <VerificationBadge badge={badge || tier.label} />
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Higher trust scores grant priority booking approval, lower security deposit requirements, and platform trust badges.
          </p>
        </div>

        <CircularProgress value={score} size={85} strokeWidth={9}>
          <ShieldCheck className="w-8 h-8 text-emerald-500" />
        </CircularProgress>
      </div>
    </VerificationSectionCard>
  );
};

export default TrustScoreCard;
