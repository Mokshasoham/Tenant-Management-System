import React from 'react';
import { ShieldCheck, Award, Sparkles, Shield, AlertCircle } from 'lucide-react';
import { BADGE_TIER_CONFIG } from '../../../constants/verification/badges';

export const VerificationBadge = ({ badge = 'UNVERIFIED', className = '' }) => {
  const config = BADGE_TIER_CONFIG[badge.toUpperCase()] || BADGE_TIER_CONFIG.UNVERIFIED;

  const renderIcon = () => {
    switch (badge.toUpperCase()) {
      case 'PLATINUM':
        return <Sparkles className="w-3.5 h-3.5 text-violet-500" />;
      case 'GOLD':
        return <Award className="w-3.5 h-3.5 text-amber-500" />;
      case 'SILVER':
        return <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />;
      case 'BRONZE':
        return <Shield className="w-3.5 h-3.5 text-amber-700" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black capitalize bg-card border-border shadow-sm ${className}`}
    >
      {renderIcon()}
      <span>{config.label}</span>
    </span>
  );
};

export default VerificationBadge;
