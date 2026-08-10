import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ShieldCheck, ArrowRight } from 'lucide-react';

export function RenewalEligibilityCard({ eligibility }) {
  const navigate = useNavigate();

  const isEligible = eligibility?.eligible ?? false;
  const checklist = eligibility?.checklist || {};

  const items = [
    {
      key: 'withinRenewalWindow',
      label: 'Lease within 90-day renewal window',
      passed: checklist.withinRenewalWindow ?? true,
      failAction: null
    },
    {
      key: 'noOutstandingRent',
      label: 'Rent balance clear (₹0 outstanding)',
      passed: checklist.noOutstandingRent ?? true,
      failAction: { label: 'View Payments', path: '/payments' }
    },
    {
      key: 'noPendingMaintenance',
      label: 'No unresolved maintenance issues',
      passed: checklist.noPendingMaintenance ?? true,
      failAction: { label: 'View Maintenance', path: '/maintenance' }
    },
    {
      key: 'noExistingRequest',
      label: 'No existing active renewal request in progress',
      passed: checklist.noExistingRequest ?? true,
      failAction: null
    },
    {
      key: 'leaseNotExpired',
      label: 'Lease agreement currently active',
      passed: checklist.leaseNotExpired ?? true,
      failAction: null
    }
  ];

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">RENEWAL ELIGIBILITY</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Automated criteria verification</p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border ${
            isEligible
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
          }`}
        >
          {isEligible ? 'CONFIRMED ELIGIBLE' : 'ACTION REQUIRED'}
        </span>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.key}
            className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-colors ${
              item.passed
                ? 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300'
                : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40 text-rose-800 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {item.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{item.label}</span>
            </div>

            {!item.passed && item.failAction && (
              <button
                onClick={() => navigate(item.failAction.path)}
                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
              >
                <span>{item.failAction.label}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default RenewalEligibilityCard;
