import React from 'react';

export const VerificationSkeleton = ({ className = '' }) => {
  return (
    <div className={`p-6 rounded-2xl border border-border bg-card space-y-4 animate-pulse ${className}`}>
      <div className="flex items-center justify-between">
        <div className="h-5 bg-muted rounded w-1/3" />
        <div className="h-6 bg-muted rounded-full w-20" />
      </div>
      <div className="h-4 bg-muted rounded w-2/3" />
      <div className="h-20 bg-muted/60 rounded-xl w-full" />
    </div>
  );
};

export default VerificationSkeleton;
