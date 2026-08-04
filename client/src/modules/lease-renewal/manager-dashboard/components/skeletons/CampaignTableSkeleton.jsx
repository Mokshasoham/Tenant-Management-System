import React from 'react';

export const CampaignTableSkeleton = () => {
  return (
    <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shadow-sm p-6 animate-pulse space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-40"></div>
        <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl w-64"></div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100/50 dark:border-slate-800/50">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-36"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-20"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-28"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CampaignTableSkeleton;
