import React from 'react';
import { Activity, XCircle, RefreshCw } from 'lucide-react';
import { StatusMetadata, RenewalStatuses } from '../constants/dashboardConstants';
import { formatCurrency } from '../utils/dashboardHelpers';

export const RenewalStatusCard = ({ renewal, onCancel }) => {
  if (!renewal) return null;

  const meta = StatusMetadata[renewal.status] || {
    label: renewal.status,
    color: 'slate',
    progress: 50,
    description: 'Status details are being processed.',
    actionText: 'Contact Agent'
  };

  const badgeColorMap = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
    blue: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
    amber: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
    purple: 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30',
    rose: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30',
    teal: 'bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/30',
    cyan: 'bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-900/30',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30',
    slate: 'bg-slate-50 dark:bg-slate-800 text-slate-600'
  };

  const badgeClasses = `px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${badgeColorMap[meta.color] || badgeColorMap.slate}`;
  const barColor = {
    emerald: 'bg-emerald-500',
    blue: 'bg-primary',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    rose: 'bg-rose-500',
    teal: 'bg-teal-500',
    cyan: 'bg-cyan-500',
    indigo: 'bg-indigo-500',
    slate: 'bg-slate-500'
  }[meta.color] || 'bg-slate-500';

  const showCancel = ['requested', 'under_review', 'counter_offer'].includes(renewal.status);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Activity size={20} className="text-primary" />
          <span>Renewal Offer Status</span>
        </h4>
        <span className={badgeClasses}>{meta.label}</span>
      </div>

      <div className="space-y-4">
        {/* Status progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 font-medium">
            <span>Overall Progress</span>
            <span>{meta.progress}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${meta.progress}%` }} />
          </div>
        </div>

        {/* Info detail block */}
        <div className="bg-slate-50 dark:bg-slate-850/50 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/30 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="block text-xs text-slate-400 dark:text-slate-500 font-medium">Proposal Reference</span>
              <span className="font-semibold text-slate-700 dark:text-slate-350">{renewal.renewalNumber}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-400 dark:text-slate-500 font-medium">Proposed Rent</span>
              <span className="font-semibold text-slate-700 dark:text-slate-350">{formatCurrency(renewal.proposedRent)}</span>
            </div>
          </div>
          <div>
            <span className="block text-xs text-slate-400 dark:text-slate-500 font-medium">Term Duration</span>
            <span className="font-semibold text-slate-700 dark:text-slate-350">{renewal.duration}</span>
          </div>
          <p className="text-xs text-slate-550 dark:text-slate-450 border-t border-slate-100 dark:border-slate-800 pt-2 leading-relaxed">
            {meta.description}
          </p>
        </div>

        {/* Cancellation Button */}
        {showCancel && (
          <button
            onClick={() => onCancel(renewal.id)}
            className="w-full flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-950/10 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-semibold px-4 py-2.5 rounded-xl transition duration-150"
            aria-label="Cancel renewal request"
          >
            <XCircle size={16} />
            <span>Cancel Renewal Request</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default RenewalStatusCard;
