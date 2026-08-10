import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export function MaintenanceSummaryCard({ maintenance }) {
  const navigate = useNavigate();

  const openCount = maintenance?.openCount ?? 0;
  const totalCount = maintenance?.totalCount ?? 0;
  const resolvedCount = Math.max(0, totalCount - openCount);

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">MAINTENANCE STATUS</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Unit repair tickets standing</p>
            </div>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              openCount === 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            {openCount === 0 ? 'ALL RESOLVED' : `${openCount} OPEN`}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Open Requests
            </span>
            <p
              className={`text-base font-extrabold ${
                openCount === 0 ? 'text-slate-900 dark:text-slate-100' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {openCount}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Resolved Lifetime
            </span>
            <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              {resolvedCount}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
          <span>Total Logged Tickets:</span>
          <strong className="text-slate-900 dark:text-slate-100">{totalCount}</strong>
        </div>
      </div>

      <button
        onClick={() => navigate('/maintenance')}
        className="w-full py-2.5 px-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <span>View Maintenance Tickets</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default MaintenanceSummaryCard;
