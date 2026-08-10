import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Upload, CreditCard, ShieldCheck } from 'lucide-react';

export function RenewalActionCenter({
  user,
  payments,
  eligibility,
  activeRenewal,
  onUploadKyc,
  onStartRenewal
}) {
  const navigate = useNavigate();

  const outstanding = payments?.outstandingBalance ?? 0;
  const isKycMissing = !user?.kycStatus || user?.kycStatus === 'unverified' || user?.kycStatus === 'pending';
  const isEligible = eligibility?.eligible ?? false;

  // Build dynamic list of pending and completed actions
  const actions = [];

  if (isKycMissing) {
    actions.push({
      id: 'action-kyc',
      type: 'warning',
      title: 'KYC Verification Required',
      description: 'Upload identity verification documents to expedite lease renewal approval.',
      buttonText: 'Upload Documents',
      onClick: onUploadKyc
    });
  }

  if (outstanding > 0) {
    actions.push({
      id: 'action-payment',
      type: 'warning',
      title: 'Outstanding Balance Pending',
      description: `Clear unpaid balance of ₹${outstanding.toLocaleString('en-IN')} prior to renewal submission.`,
      buttonText: 'Pay Rent Now',
      onClick: () => navigate('/payments')
    });
  }

  if (isEligible && !activeRenewal) {
    actions.push({
      id: 'action-start',
      type: 'success',
      title: 'Renewal Eligibility Confirmed',
      description: 'Your account meets all qualification criteria. You can submit your renewal request.',
      buttonText: 'Start Renewal Process',
      onClick: onStartRenewal
    });
  }

  if (outstanding === 0 && !isKycMissing) {
    actions.push({
      id: 'action-clear',
      type: 'info',
      title: 'No Pending Action Items',
      description: 'All account compliance requirements, rent balances, and documents are up to date.',
      buttonText: null,
      onClick: null
    });
  }

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">ACTION CENTER</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Required compliance actions</p>
          </div>
        </div>

        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
          {actions.length} Item{actions.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-3">
        {actions.map((act) => (
          <div
            key={act.id}
            className={`p-4 rounded-2xl border space-y-2 text-xs transition-all ${
              act.type === 'warning'
                ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                : act.type === 'success'
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                : 'bg-slate-50/60 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {act.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              <span>{act.title}</span>
            </div>

            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
              {act.description}
            </p>

            {act.buttonText && act.onClick && (
              <div className="pt-1">
                <button
                  onClick={act.onClick}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer active:scale-95 ${
                    act.type === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  }`}
                >
                  {act.buttonText}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default RenewalActionCenter;
