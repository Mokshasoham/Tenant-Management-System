import React from 'react';

export const UpcomingAndOverdueTables = ({
  workloadData = {},
  onQuickAction,
  loading = false
}) => {
  const upcoming = workloadData?.upcomingExpirations || [];
  const overdue = workloadData?.overdueCampaigns || [];

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Upcoming Expirations */}
      <div className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
            <span>📅</span> Upcoming Expirations (Next 30 Days)
          </h3>
          <span className="text-xs text-indigo-600 font-semibold">{upcoming.length} total</span>
        </div>

        {upcoming.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No upcoming expirations in the next 30 days.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
            {upcoming.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-100">{item.campaignNumber}</div>
                  <div className="text-[10px] text-slate-400">{item.propertyName} • {item.tenantName}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-slate-700 dark:text-slate-300">
                    {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="text-[10px] text-indigo-500 font-semibold">{item.daysRemaining ?? 0} days remaining</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overdue Campaigns */}
      <div className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
            <span className="text-red-500">🚨</span> Overdue & Escalated Campaigns
          </h3>
          <span className="text-xs text-red-500 font-semibold">{overdue.length} critical</span>
        </div>

        {overdue.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No overdue or escalated campaigns. Great job!
          </div>
        ) : (
          <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
            {overdue.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 text-xs">
                <div>
                  <div className="font-bold text-red-700 dark:text-red-300">{item.campaignNumber}</div>
                  <div className="text-[10px] text-slate-500">{item.propertyName} • {item.tenantName}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200 uppercase">
                    {item.status}
                  </span>
                  <button
                    onClick={() => onQuickAction('view', item)}
                    className="px-2 py-1 text-[10px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingAndOverdueTables;
