import React from 'react';
import { Play, Eye, Download, Upload, MessageSquare, ListFilter, Zap } from 'lucide-react';

export function QuickActionsCard({
  onStartRenewal,
  onViewLease,
  onDownloadDraft,
  onUploadKyc,
  onContactManager,
  onViewTimeline,
  activeRenewal,
  eligibility
}) {
  const isEligible = eligibility?.eligible ?? true;
  const hasDraft = !!activeRenewal;

  const handleScrollToTimeline = () => {
    const el = document.getElementById('lease-timeline-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else if (onViewTimeline) {
      onViewTimeline();
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">QUICK ACTIONS</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Audited functional action shortcuts</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        {/* 1. Request Renewal */}
        <button
          onClick={onStartRenewal}
          disabled={!isEligible && !activeRenewal}
          className="p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer shadow-md active:scale-95 min-h-[90px]"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>{activeRenewal ? 'Manage Renewal' : 'Request Renewal'}</span>
        </button>

        {/* 2. View Current Lease */}
        <button
          onClick={onViewLease}
          className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer active:scale-95 min-h-[90px]"
        >
          <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>View Current Lease</span>
        </button>

        {/* 3. Download Draft */}
        <button
          onClick={onDownloadDraft}
          disabled={!hasDraft}
          className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-800 dark:text-slate-200 font-bold flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer active:scale-95 min-h-[90px]"
        >
          <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>Download Draft</span>
        </button>

        {/* 4. Upload KYC Docs */}
        <button
          onClick={onUploadKyc}
          className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer active:scale-95 min-h-[90px]"
        >
          <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Upload KYC Docs</span>
        </button>

        {/* 5. Contact Manager */}
        <button
          onClick={onContactManager}
          className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer active:scale-95 min-h-[90px]"
        >
          <MessageSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span>Contact Manager</span>
        </button>

        {/* 6. View Timeline */}
        <button
          onClick={handleScrollToTimeline}
          className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer active:scale-95 min-h-[90px]"
        >
          <ListFilter className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span>View Timeline</span>
        </button>
      </div>
    </div>
  );
}

export default QuickActionsCard;
