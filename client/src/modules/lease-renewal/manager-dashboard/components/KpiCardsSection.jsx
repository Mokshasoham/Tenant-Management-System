import React from 'react';
import KpiCardsSkeleton from './skeletons/KpiCardsSkeleton';

export const KpiCardsSection = ({ summaryData = {}, loading = false, error = null }) => {
  if (loading) return <KpiCardsSkeleton />;

  if (error) {
    return (
      <div className="p-5 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/60 text-center py-6">
        <span className="text-red-500 text-xl font-bold block mb-1">⚠️</span>
        <h4 className="text-xs font-semibold text-red-700 dark:text-red-300">KPI Metrics Unavailable</h4>
        <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  const {
    totalCampaigns = 0,
    activeCampaigns = 0,
    completedThisMonth = 0,
    escalated = 0,
    expiredToday = 0,
    slaMetrics = {}
  } = summaryData;

  const slaPercentage = slaMetrics.slaCompliancePercentage ?? 100;
  const slaFormatted = slaMetrics.slaComplianceFormatted || '100.0%';

  const cards = [
    {
      title: 'Total Campaigns',
      value: totalCampaigns,
      subtitle: 'All time created',
      icon: '📊',
      badgeColor: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
    },
    {
      title: 'Active Campaigns',
      value: activeCampaigns,
      subtitle: 'In progress',
      icon: '⚡',
      badgeColor: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
    },
    {
      title: 'Completed',
      value: completedThisMonth,
      subtitle: 'Signed this month',
      icon: '✅',
      badgeColor: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
    },
    {
      title: 'Escalated',
      value: escalated,
      subtitle: 'Requires attention',
      icon: '🔥',
      badgeColor: escalated > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-50 text-slate-500'
    },
    {
      title: 'Expired Today',
      value: expiredToday,
      subtitle: 'Closed without sign',
      icon: '⏳',
      badgeColor: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
    },
    {
      title: 'SLA Compliance %',
      value: slaFormatted,
      subtitle: `${slaMetrics.slaBreachedCount || 0} breached`,
      icon: '🎯',
      badgeColor: slaPercentage >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600',
      isProgress: true,
      progressPct: slaPercentage
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {card.title}
            </span>
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${card.badgeColor}`}>
              {card.icon}
            </span>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{card.value}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">{card.subtitle}</div>

            {card.isProgress && (
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    card.progressPct >= 90 ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${card.progressPct}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KpiCardsSection;
