import React from 'react';

export const ChartsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div 
          key={i} 
          className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shadow-sm animate-pulse h-72 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-36"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16"></div>
          </div>
          <div className="flex items-center justify-center flex-1">
            <div className="w-36 h-36 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChartsSkeleton;
