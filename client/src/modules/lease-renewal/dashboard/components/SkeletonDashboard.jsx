import React from 'react';

/**
 * Enterprise skeleton dashboard loader screen (replaces raw spinners).
 */
export const SkeletonDashboard = () => {
  return (
    <div className="space-y-8 animate-pulse p-6 max-w-7xl mx-auto" aria-hidden="true">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="space-y-3">
          <div className="h-7 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-72 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      </div>

      {/* Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-44 bg-slate-200 dark:bg-slate-700 rounded-2xl shadow-sm" />
        <div className="h-44 bg-slate-200 dark:bg-slate-700 rounded-2xl shadow-sm" />
        <div className="h-44 bg-slate-200 dark:bg-slate-700 rounded-2xl shadow-sm" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl shadow-sm" />
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl shadow-sm" />
        </div>
        <div className="space-y-6">
          <div className="h-56 bg-slate-200 dark:bg-slate-700 rounded-2xl shadow-sm" />
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl shadow-sm" />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-72 bg-slate-200 dark:bg-slate-700 rounded-2xl shadow-sm" />
        <div className="h-72 bg-slate-200 dark:bg-slate-700 rounded-2xl shadow-sm" />
        <div className="h-72 bg-slate-200 dark:bg-slate-700 rounded-2xl shadow-sm" />
      </div>
    </div>
  );
};

export default SkeletonDashboard;
