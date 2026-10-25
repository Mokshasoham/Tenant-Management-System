import React from 'react';
import { Input, Button } from '../../PremiumUI';
import { useLanguage } from '../../../context/LanguageContext';

export const ReviewRemarksCard = ({
  remarks = '',
  onChange,
  onSubmit,
  actionLabel,
  disabled = false,
  className = '',
}) => {
  const { t } = useLanguage();
  const displayActionLabel = actionLabel || t('verification.submitDecision', 'Submit Decision');

  return (
    <div className={`p-4 rounded-2xl border border-border bg-card space-y-4 ${className}`}>
      <Input
        label={t('verification.reviewerRemarksNotes', 'Reviewer Remarks / Notes')}
        placeholder={t(
          'verification.reviewerRemarksPlaceholder',
          'Enter verification audit notes or rejection reasons...'
        )}
        value={remarks}
        onChange={(e) => onChange && onChange(e.target.value)}
        disabled={disabled}
      />
      {onSubmit && (
        <Button type="button" onClick={onSubmit} disabled={disabled} className="w-full">
          {displayActionLabel}
        </Button>
      )}
    </div>
  );
};

export default ReviewRemarksCard;
