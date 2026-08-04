import React from 'react';
import { AlertCircle } from 'lucide-react';

export const UpcomingActionsCard = ({ eligibility, activeRenewal }) => {
  const actions = [];

  // Generate reminders based on status states
  if (eligibility?.checklist?.noOutstandingRent === false) {
    actions.push({
      title: 'Pay Outstanding Rent',
      desc: 'You have outstanding invoices that are overdue or pending. Clear them to renew.',
      priority: 'high'
    });
  }

  if (eligibility?.checklist?.noPendingMaintenance === false) {
    actions.push({
      title: 'Resolve Open Maintenance requests',
      desc: 'Outstanding repairs exist. Please coordinate with managers to sign off.',
      priority: 'medium'
    });
  }

  if (activeRenewal?.status === 'counter_offer') {
    actions.push({
      title: 'Review Counter Offer',
      desc: 'Property manager sent an update. Approve or send feedback.',
      priority: 'high'
    });
  }

  if (activeRenewal?.status === 'approved') {
    actions.push({
      title: 'Sign Agreement Documents',
      desc: 'Verify and execute your digital lease signature.',
      priority: 'high'
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: 'Upload Profile KYC files',
      desc: 'Keep documents current to expedite renewal processing.',
      priority: 'low'
    });
  }

  const badgeColor = {
    high: 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border border-rose-100 dark:border-rose-900/30',
    medium: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 border border-amber-100 dark:border-amber-900/30',
    low: 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800'
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <AlertCircle size={20} className="text-amber-500" />
        <span>Action Items</span>
      </h4>

      <div className="space-y-4">
        {actions.map((act, index) => (
          <div key={index} className="flex justify-between items-start gap-4 p-4 bg-slate-50 dark:bg-slate-850/50 rounded-2xl">
            <div className="space-y-1">
              <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">{act.title}</span>
              <p className="text-xs text-slate-500 dark:text-slate-405 leading-relaxed">{act.desc}</p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${badgeColor[act.priority]}`}>
              {act.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingActionsCard;
