import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export const RenewalEligibilityCard = ({ eligibility }) => {
  if (!eligibility) return null;

  const { eligible, checklist } = eligibility;

  const items = [
    {
      key: 'withinRenewalWindow',
      label: 'Within 90-day Renewal Window',
      valid: checklist?.withinRenewalWindow,
      errorMsg: 'Lease end date is more than 90 days away.'
    },
    {
      key: 'noOutstandingRent',
      label: 'No Outstanding Rent Balance',
      valid: checklist?.noOutstandingRent,
      errorMsg: 'Clear pending payments to remove block.'
    },
    {
      key: 'noPendingMaintenance',
      label: 'No Pending Maintenance Tickets',
      valid: checklist?.noPendingMaintenance,
      errorMsg: 'Resolve active repair requests first.'
    },
    {
      key: 'noExistingRequest',
      label: 'No Existing Pending Renewal Offer',
      valid: checklist?.noExistingRequest,
      errorMsg: 'An active renewal process is already underway.'
    },
    {
      key: 'leaseNotExpired',
      label: 'Lease Agreement Not Expired',
      valid: checklist?.leaseNotExpired,
      errorMsg: 'Your current lease has already expired.'
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 font-bold">Eligibility Requirements</h4>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
          eligible
            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100'
            : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100'
        }`}>
          {eligible ? 'ELIGIBLE' : 'BLOCKED'}
        </span>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              {item.valid ? (
                <CheckCircle2 className="text-emerald-500 w-5 h-5" />
              ) : (
                <XCircle className="text-rose-500 w-5 h-5" />
              )}
            </div>
            <div>
              <span className="block text-sm font-semibold text-slate-700 dark:text-slate-350">{item.label}</span>
              {!item.valid && (
                <span className="block text-xs text-rose-500 font-medium leading-relaxed mt-0.5">
                  {item.errorMsg}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RenewalEligibilityCard;
