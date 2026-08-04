import React from 'react';
import { History } from 'lucide-react';
import { formatDate } from '../utils/dashboardHelpers';

export const RecentActivityCard = ({ activities = [] }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <History size={20} className="text-primary" />
        <span>Recent Activity</span>
      </h4>

      {activities.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">No activity logged.</p>
      ) : (
        <div className="space-y-4">
          {activities.map((act) => (
            <div key={act.id} className="flex justify-between items-start gap-4 pb-3 border-b border-slate-50 dark:border-slate-850 last:border-0 last:pb-0">
              <div className="space-y-0.5">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-205">{act.message}</span>
                <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                  {formatDate(act.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivityCard;
