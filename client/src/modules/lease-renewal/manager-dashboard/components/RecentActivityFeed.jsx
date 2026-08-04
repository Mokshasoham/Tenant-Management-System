import React from 'react';
import RecentActivitySkeleton from './skeletons/RecentActivitySkeleton';

export const RecentActivityFeed = ({
  activityData = [],
  loading = false
}) => {
  if (loading) return <RecentActivitySkeleton />;

  return (
    <div className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
          <span>📜</span> Recent Campaign Audit & Activity Feed
        </h3>
        <span className="text-xs text-slate-400 font-medium">Live Audit Log</span>
      </div>

      {activityData.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          No recent campaign activity logged.
        </div>
      ) : (
        <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
          {activityData.map((act, idx) => (
            <div key={idx} className="flex items-start space-x-3 text-xs border-b border-slate-50 dark:border-slate-800/40 pb-2.5 last:border-0">
              <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                {act.action?.substring(0, 1).toUpperCase() || 'A'}
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{act.campaignNumber}</span>
                  <span className="text-[10px] text-slate-400">
                    {act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 font-normal">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{act.actorName || 'System'}</span> {act.description || act.action}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivityFeed;
