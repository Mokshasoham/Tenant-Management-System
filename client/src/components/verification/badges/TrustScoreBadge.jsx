import React from 'react';
import { getTrustBadgeTier } from '../../../utils/trustScoreHelpers';

export const TrustScoreBadge = ({ score = 0, className = '' }) => {
  const tier = getTrustBadgeTier(score);

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border bg-card border-border shadow-sm ${className}`}
    >
      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
      <span className="text-xs font-black text-foreground">{score} / 100</span>
      <span className="text-[10px] font-bold text-muted-foreground uppercase">{tier.label}</span>
    </div>
  );
};

export default TrustScoreBadge;
