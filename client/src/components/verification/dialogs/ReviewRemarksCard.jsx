import React from 'react';
import { Input, Button } from '../../PremiumUI';

export const ReviewRemarksCard = ({
  remarks = '',
  onChange,
  onSubmit,
  actionLabel = 'Submit Decision',
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`p-4 rounded-2xl border border-border bg-card space-y-4 ${className}`}>
      <Input
        label="Reviewer Remarks / Notes"
        placeholder="Enter verification audit notes or rejection reasons..."
        value={remarks}
        onChange={(e) => onChange && onChange(e.target.value)}
        disabled={disabled}
      />
      {onSubmit && (
        <Button type="button" onClick={onSubmit} disabled={disabled} className="w-full">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default ReviewRemarksCard;
