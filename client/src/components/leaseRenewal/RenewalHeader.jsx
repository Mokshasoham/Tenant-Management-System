import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export function RenewalHeader({ lease, activeRenewal, eligibility, onBack }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const getStatusBadge = () => {
    if (activeRenewal) {
      const statusMap = {
        requested: { label: 'Request Submitted', color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
        under_review: { label: 'Under Manager Review', color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
        counter_offer: { label: 'Counter Offer Offered', color: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
        approved: { label: 'Renewal Approved', color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
        signed: { label: 'Agreement Signed', color: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
        completed: { label: 'Renewal Completed', color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
        rejected: { label: 'Renewal Rejected', color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
      };
      return statusMap[activeRenewal.status] || { label: activeRenewal.status, color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' };
    }

    if (eligibility?.eligible) {
      return { label: 'Renewal Eligible', color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
    }

    return { label: 'Ineligible for Renewal', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700' };
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="space-y-4">
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition active:scale-95"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>BACK</span>
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Lease Renewal Workspace
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Renew your current lease with confidence & transparent term reviews
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Lease ACTIVE
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {lease?.daysRemaining ?? 0} Days Remaining
          </span>

          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${statusBadge.color}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            {statusBadge.label}
          </span>
        </div>
      </div>
    </div>
  );
}

export default RenewalHeader;
