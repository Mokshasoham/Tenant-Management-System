import React from 'react';
import { Wrench } from 'lucide-react';

export const MaintenanceSummaryCard = ({ maintenance }) => {
  const hasOpenTickets = maintenance?.openCount > 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Wrench size={20} className="text-primary" />
          <span>Maintenance Status</span>
        </h4>
        {hasOpenTickets && (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 border border-amber-100 dark:border-amber-900/30">
            Open Requests
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Open Requests */}
        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl space-y-1">
          <span className="block text-xs text-slate-400 dark:text-slate-500 font-medium">Pending Repairs</span>
          <span className="block text-xl font-bold text-slate-805 dark:text-slate-150">
            {maintenance?.openCount || 0}
          </span>
        </div>

        {/* Total Requests */}
        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl space-y-1">
          <span className="block text-xs text-slate-400 dark:text-slate-500 font-medium">Total Lifetime</span>
          <span className="block text-xl font-bold text-slate-805 dark:text-slate-150">
            {maintenance?.totalCount || 0}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceSummaryCard;
