import React from 'react';
import { Calendar, DollarSign, Clock } from 'lucide-react';
import { formatDate, formatCurrency, getRemainingDaysColor } from '../utils/dashboardHelpers';

export const LeaseSummaryCard = ({ lease }) => {
  if (!lease) return null;

  const color = getRemainingDaysColor(lease.daysRemaining);
  const colorClasses = {
    rose: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30',
    amber: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
  }[color] || 'bg-slate-50 dark:bg-slate-800 text-slate-600';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Lease Details</h4>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${colorClasses}`}>
          {lease.daysRemaining} Days Left
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Rent */}
        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <span className="block text-xs text-slate-400 dark:text-slate-500 font-medium">Rent Amount</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              {formatCurrency(lease.rentAmount)}/mo
            </span>
          </div>
        </div>

        {/* Deposit */}
        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <span className="block text-xs text-slate-400 dark:text-slate-500 font-medium">Security Deposit</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              {formatCurrency(lease.securityDeposit)}
            </span>
          </div>
        </div>

        {/* Start Date */}
        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <span className="block text-xs text-slate-400 dark:text-slate-500 font-medium">Start Date</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              {formatDate(lease.startDate)}
            </span>
          </div>
        </div>

        {/* End Date */}
        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <span className="block text-xs text-slate-400 dark:text-slate-500 font-medium">End Date</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              {formatDate(lease.endDate)}
            </span>
          </div>
        </div>
      </div>

      {/* Duration Info */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
        <Clock size={14} />
        <span>Lease duration parameters: <strong className="text-slate-700 dark:text-slate-350">{lease.duration}</strong></span>
      </div>
    </div>
  );
};

export default LeaseSummaryCard;
