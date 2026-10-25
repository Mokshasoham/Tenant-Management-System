import React from 'react';
import TimelineItem from '../history/TimelineItem';
import { useLanguage } from '../../../context/LanguageContext';

export const VerificationTimeline = ({ timeline = [], className = '' }) => {
  const { t } = useLanguage();

  if (timeline.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-4 text-center">
        {t('verification.noTimelineEvents', 'No timeline events recorded yet.')}
      </div>
    );
  }

  return (
    <div className={`space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border ${className}`}>
      {timeline.map((item, idx) => (
        <TimelineItem key={item._id || idx} item={item} />
      ))}
    </div>
  );
};

export default VerificationTimeline;
