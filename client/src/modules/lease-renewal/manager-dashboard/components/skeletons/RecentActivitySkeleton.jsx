import React from 'react';

export const RecentActivitySkeleton = () => {
  return (
    <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shadow-sm p-6 animate-pulse space-y-4">
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-32 pb-3 border-b border-slate-100 dark:border-slate-800"></div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800"></div>
            <div className="flex-1 space-y-1">
              <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
              <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivitySkeleton;
