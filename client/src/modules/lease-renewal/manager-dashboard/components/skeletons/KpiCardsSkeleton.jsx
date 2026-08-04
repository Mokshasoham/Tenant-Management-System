import React from 'react';

export const KpiCardsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div 
          key={i} 
          className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shadow-sm animate-pulse flex flex-col justify-between h-32"
        >
          <div className="flex items-center justify-between">
            <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
            <div className="w-9 h-9 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          </div>
          <div className="space-y-2">
            <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded w-16"></div>
            <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-20"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default KpiCardsSkeleton;
