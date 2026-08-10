import React from 'react';
import { Check, Clock, FileText, Send, UserCheck, Award } from 'lucide-react';

export function RenewalProgress({ activeRenewal, currentStep = 0 }) {
  // Determine progress step based on activeRenewal status
  const getStepIndex = () => {
    if (!activeRenewal) return currentStep > 0 ? currentStep : 0; // 0: Current Lease, 1: Options, 2: Review
    const status = activeRenewal.status;
    switch (status) {
      case 'requested':
        return 3; // Submitted
      case 'under_review':
      case 'counter_offer':
        return 4; // Manager Approval
      case 'approved':
      case 'signed':
        return 5; // Agreement
      case 'completed':
        return 6; // Completed
      case 'rejected':
      case 'cancelled':
        return 3;
      default:
        return 0;
    }
  };

  const activeIndex = getStepIndex();

  const STEPS = [
    { label: 'Current Lease', icon: FileText },
    { label: 'Renewal Options', icon: Clock },
    { label: 'Review', icon: Check },
    { label: 'Submitted', icon: Send },
    { label: 'Manager Approval', icon: UserCheck },
    { label: 'Agreement', icon: Award }
  ];

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          RENEWAL PROGRESS WORKFLOW
        </h3>
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
          Step {Math.min(activeIndex + 1, STEPS.length)} of {STEPS.length}
        </span>
      </div>

      <div className="relative pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 relative">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx < activeIndex;
            const isCurrent = idx === activeIndex;

            return (
              <div
                key={step.label}
                className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                  isCompleted
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                    : isCurrent
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                    : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className="text-[11px] font-bold tracking-tight leading-tight">
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RenewalProgress;
