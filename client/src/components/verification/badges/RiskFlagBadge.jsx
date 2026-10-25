import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export const RiskFlagBadge = ({ riskScore = 0, manualReviewRequired = false, className = '' }) => {
  const { t } = useLanguage();

  if (manualReviewRequired || riskScore >= 50) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold bg-rose-500/10 text-rose-500 border-rose-500/20 ${className}`}
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>
          {t('verification.riskManualReview', 'Manual Review ({{score}} Risk)', {
            score: riskScore,
          })}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold bg-emerald-500/10 text-emerald-500 border-emerald-500/20 ${className}`}
    >
      <ShieldCheck className="w-3.5 h-3.5" />
      <span>
        {t('verification.riskLow', 'Low Risk ({{score}} Risk)', {
          score: riskScore,
        })}
      </span>
    </span>
  );
};

export default RiskFlagBadge;
