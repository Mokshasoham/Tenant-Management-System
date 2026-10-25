import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../../PremiumUI';
import { useLanguage } from '../../../context/LanguageContext';

export const VerificationErrorState = ({
  error,
  onRetry,
  className = '',
}) => {
  const { t } = useLanguage();
  const displayError = error || t('verification.failedToLoad', 'Failed to load verification details.');

  return (
    <div className={`p-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-500 flex items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-semibold">{displayError}</span>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="text-xs border-rose-500/30 text-rose-500 hover:bg-rose-500/10 py-1.5 px-3">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          {t('verification.retry', 'Retry')}
        </Button>
      )}
    </div>
  );
};

export default VerificationErrorState;
