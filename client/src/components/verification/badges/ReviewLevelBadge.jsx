import React from 'react';
import { REVIEW_LEVEL_CONFIG } from '../../../constants/verification/reviewLevels';
import { useLanguage } from '../../../context/LanguageContext';

export const ReviewLevelBadge = ({ level = 'LEVEL_1_AUTO', className = '' }) => {
  const { t } = useLanguage();
  const normalizedLevel = String(level).toUpperCase();
  const config = REVIEW_LEVEL_CONFIG[normalizedLevel] || REVIEW_LEVEL_CONFIG.LEVEL_1_AUTO;
  const localizedTitle = t(`verification.reviewLevel_${normalizedLevel.toLowerCase()}`, config.title);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 ${className}`}
    >
      {localizedTitle}
    </span>
  );
};

export default ReviewLevelBadge;
