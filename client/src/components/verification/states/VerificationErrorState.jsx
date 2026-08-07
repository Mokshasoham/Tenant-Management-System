import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../../PremiumUI';

export const VerificationErrorState = ({
  error = 'Failed to load verification details.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`p-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-500 flex items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-semibold">{error}</span>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="text-xs border-rose-500/30 text-rose-500 hover:bg-rose-500/10 py-1.5 px-3">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Retry
        </Button>
      )}
    </div>
  );
};

export default VerificationErrorState;
