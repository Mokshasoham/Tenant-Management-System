import React, { memo } from 'react';

export const StatusIndicator = memo(({ status = 'active', size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  
  const statusColors = {
    active: 'bg-emerald-500 animate-pulse',
    pending: 'bg-amber-500 animate-pulse',
    inactive: 'bg-muted-foreground/40',
    error: 'bg-rose-500'
  };

  return (
    <span className={`inline-block rounded-full ${sizeClasses} ${statusColors[status] || statusColors.inactive}`} />
  );
});

StatusIndicator.displayName = 'StatusIndicator';
export default StatusIndicator;
