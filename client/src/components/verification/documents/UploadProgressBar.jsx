import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

export const UploadProgressBar = ({ progress = 0, label, className = '' }) => {
  const { t } = useLanguage();
  const displayLabel = label || t('verification.uploadingFile', 'Uploading file...');

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-foreground">{displayLabel}</span>
        <span className="text-primary font-bold">{progress}%</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default UploadProgressBar;
