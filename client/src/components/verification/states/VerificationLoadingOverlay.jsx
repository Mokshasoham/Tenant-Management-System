import React from 'react';
import LoadingSpinner from '../../LoadingSpinner';

export const VerificationLoadingOverlay = ({ text = 'Processing verification...' }) => {
  return (
    <div className="absolute inset-0 bg-card/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3 rounded-2xl animate-fade-in">
      <LoadingSpinner />
      <p className="text-xs font-bold text-foreground">{text}</p>
    </div>
  );
};

export default VerificationLoadingOverlay;
