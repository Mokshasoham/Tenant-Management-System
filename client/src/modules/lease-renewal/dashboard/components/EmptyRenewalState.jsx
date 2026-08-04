import React from 'react';
import { Calendar, FileText, ArrowRight } from 'lucide-react';

/**
 * Empty state component shown when a tenant has not started any lease renewal request.
 */
export const EmptyRenewalState = ({ lease, eligibility, onStartRenewal }) => {
  const isBlocked = !eligibility?.eligible;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 text-center shadow-sm max-w-2xl mx-auto space-y-6">
      <div className="mx-auto w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500">
        <FileText size={32} />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          No Active Renewal Request
        </h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Your lease expires in <span className="font-semibold text-slate-700 dark:text-slate-300">{lease?.daysRemaining} days</span>. You can submit a request to lock in your next term.
        </p>
      </div>

      {isBlocked ? (
        <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 px-4 py-3 rounded-2xl text-sm border border-rose-100/50 dark:border-rose-900/30 max-w-md mx-auto flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <span className="text-left leading-relaxed">
            Renewal is currently blocked due to pending checklist tasks. Review the eligibility panel.
          </span>
        </div>
      ) : (
        <button
          onClick={onStartRenewal}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-medium px-6 py-3 rounded-2xl transition duration-200 shadow-lg shadow-primary/20 hover:shadow-primary/30"
          aria-label="Start lease renewal request"
        >
          <span>Start Renewal Process</span>
          <ArrowRight size={18} />
        </button>
      )}
    </div>
  );
};

export default EmptyRenewalState;
