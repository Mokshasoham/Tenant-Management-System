import React from 'react';
import { REVIEW_LEVEL_CONFIG } from '../../../constants/verification/reviewLevels';

export const ReviewLevelBadge = ({ level = 'LEVEL_1_AUTO', className = '' }) => {
  const config = REVIEW_LEVEL_CONFIG[level.toUpperCase()] || REVIEW_LEVEL_CONFIG.LEVEL_1_AUTO;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 ${className}`}
    >
      {config.title}
    </span>
  );
};

export default ReviewLevelBadge;
