import React from 'react';
import { Heart, ShieldCheck, AlertCircle } from 'lucide-react';

export function LeaseHealthCard({ score, hasData = true }) {
  const getRating = (val) => {
    if (val >= 90) return { label: 'EXCELLENT', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500' };
    if (val >= 75) return { label: 'GOOD', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500' };
    if (val >= 60) return { label: 'FAIR', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500' };
    return { label: 'NEEDS ATTENTION', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500' };
  };

  const rating = getRating(score ?? 100);

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Heart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">LEASE HEALTH SCORE</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Account standing index</p>
          </div>
        </div>

        {hasData && (
          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${rating.color} bg-slate-100 dark:bg-slate-800`}>
            {rating.label}
          </span>
        )}
      </div>

      {!hasData ? (
        <div className="py-6 text-center space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-slate-400" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Not enough data to calculate score</p>
        </div>
      ) : (
        <div className="flex items-center gap-6 py-2">
          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100 dark:text-slate-800 stroke-current"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`${rating.color} stroke-current transition-all duration-1000 ease-out`}
                strokeDasharray={`${score}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{score}%</span>
            </div>
          </div>

          <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            <p>
              Calculated dynamically from payment history, active repair tickets, and lease document compliance.
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified account profile
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaseHealthCard;
