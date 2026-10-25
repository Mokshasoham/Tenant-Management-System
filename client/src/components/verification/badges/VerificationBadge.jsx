import React from 'react';
import { ShieldCheck, Award, Sparkles, Shield, AlertCircle } from 'lucide-react';
import { BADGE_TIER_CONFIG } from '../../../constants/verification/badges';
import { useLanguage } from '../../../context/LanguageContext';
import { getLocalizedStatus } from '../../../utils/statusLocalization';

export const VerificationBadge = ({ badge = 'UNVERIFIED', className = '' }) => {
  const { t } = useLanguage();
  const config = BADGE_TIER_CONFIG[String(badge).toUpperCase()] || BADGE_TIER_CONFIG.UNVERIFIED;
  const localizedLabel = getLocalizedStatus(badge, t, 'verificationBadge') || config.label;

  const renderIcon = () => {
    switch (String(badge).toUpperCase()) {
      case 'PLATINUM':
      case 'PLATINUM_ELITE':
        return <Sparkles className="w-3.5 h-3.5 text-violet-500" />;
      case 'GOLD':
      case 'GOLD_VERIFIED':
      case 'GOLD_PROPERTY':
        return <Award className="w-3.5 h-3.5 text-amber-500" />;
      case 'SILVER':
      case 'SILVER_VERIFIED':
        return <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />;
      case 'BRONZE':
      case 'BRONZE_TRUST':
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
      <span>{localizedLabel}</span>
    </span>
  );
};

export default VerificationBadge;
