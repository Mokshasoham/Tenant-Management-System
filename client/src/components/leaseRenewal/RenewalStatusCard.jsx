import React from 'react';
import { ArrowRight, Clock, FileCheck2, AlertCircle, CheckCircle2, RefreshCw, XCircle, FileSignature } from 'lucide-react';

const formatCurrency = (val) => {
  if (val === undefined || val === null) return '₹0';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
};

export function RenewalStatusCard({
  activeRenewal,
  eligibility,
  onStartRenewal,
  onCancelRenewal,
  onReviewAgreement,
  onSignAgreement
}) {
  // Determine state display configuration
  const getStateInfo = () => {
    if (!activeRenewal) {
      if (eligibility?.eligible) {
        return {
          state: 'ELIGIBLE',
          title: 'You are Eligible for Renewal',
          subtitle: 'Your lease window is open with clear rent & maintenance standing.',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
          icon: CheckCircle2,
          buttonText: 'Start Renewal',
          action: onStartRenewal,
          buttonStyle: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
        };
      } else {
        return {
          state: 'NOT_ELIGIBLE',
          title: 'Renewal Currently Unavailable',
          subtitle: eligibility?.checklist?.withinRenewalWindow === false
            ? 'Renewal opens within 90 days of lease expiration.'
            : 'Please resolve outstanding rent or open maintenance items before starting.',
          badgeColor: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
          icon: AlertCircle,
          buttonText: null,
          action: null
        };
      }
    }

    const status = activeRenewal.status;
    switch (status) {
      case 'requested':
      case 'SUBMITTED':
        return {
          state: 'SUBMITTED',
          title: 'Renewal Request Submitted',
          subtitle: 'Your renewal request is registered and pending property manager review.',
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
          icon: Clock,
          buttonText: 'View Request Details',
          action: () => alert(`Renewal Request ${activeRenewal.renewalNumber || activeRenewal.id} is submitted and under review.`),
          buttonStyle: 'bg-slate-800 hover:bg-slate-900 text-white'
        };

      case 'under_review':
      case 'UNDER_REVIEW':
        return {
          state: 'UNDER_REVIEW',
          title: 'Under Manager Review',
          subtitle: 'Property manager is reviewing proposed terms and scheduling contract updates.',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
          icon: Clock,
          buttonText: 'Check Review Status',
          action: () => alert('Manager is currently reviewing your lease terms.'),
          buttonStyle: 'bg-blue-600 hover:bg-blue-700 text-white'
        };

      case 'counter_offer':
        return {
          state: 'COUNTER_OFFER',
          title: 'Manager Proposed Counter Offer',
          subtitle: `Manager proposed ${formatCurrency(activeRenewal.proposedRent)} for ${activeRenewal.duration}.`,
          badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
          icon: RefreshCw,
          buttonText: 'Review Counter Offer',
          action: onReviewAgreement || (() => alert('Reviewing counter offer...')),
          buttonStyle: 'bg-indigo-600 hover:bg-indigo-700 text-white'
        };

      case 'approved':
      case 'APPROVED':
      case 'AGREEMENT_READY':
        return {
          state: 'AGREEMENT_READY',
          title: 'Renewal Approved — Agreement Ready',
          subtitle: 'Your manager approved the renewal. Please review and sign the agreement.',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
          icon: FileCheck2,
          buttonText: 'Review & Sign Agreement',
          action: onSignAgreement || onReviewAgreement,
          buttonStyle: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
        };

      case 'signed':
      case 'SIGNATURE_PENDING':
        return {
          state: 'SIGNATURE_PENDING',
          title: 'Signature Submitted',
          subtitle: 'Tenant signature recorded. Awaiting final manager co-signature.',
          badgeColor: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
          icon: FileSignature,
          buttonText: 'View Signed Copy',
          action: onReviewAgreement,
          buttonStyle: 'bg-teal-600 hover:bg-teal-700 text-white'
        };

      case 'completed':
      case 'COMPLETED':
        return {
          state: 'COMPLETED',
          title: 'Lease Successfully Renewed',
          subtitle: 'Your new lease agreement is active and recorded in system archives.',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
          icon: CheckCircle2,
          buttonText: 'View Agreement Document',
          action: onReviewAgreement,
          buttonStyle: 'bg-slate-900 hover:bg-slate-800 text-white'
        };

      case 'rejected':
      case 'REJECTED':
        return {
          state: 'REJECTED',
          title: 'Renewal Request Declined',
          subtitle: activeRenewal.rejectionReason || 'Manager declined request. Contact manager for details.',
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
          icon: XCircle,
          buttonText: 'Contact Property Manager',
          action: () => alert('Please contact manager regarding rejection reason.'),
          buttonStyle: 'bg-rose-600 hover:bg-rose-700 text-white'
        };

      default:
        return {
          state: 'DRAFT',
          title: 'Renewal Draft in Progress',
          subtitle: 'Your renewal draft has been saved. You can continue anytime.',
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
          icon: Clock,
          buttonText: 'Continue Renewal',
          action: onStartRenewal,
          buttonStyle: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
    }
  };

  const stateInfo = getStateInfo();
  const Icon = stateInfo.icon;

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            RENEWAL STATUS
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${stateInfo.badgeColor}`}>
            <Icon className="w-3.5 h-3.5" />
            {stateInfo.state}
          </span>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{stateInfo.title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{stateInfo.subtitle}</p>
        </div>

        {activeRenewal && (
          <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5 font-mono">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Proposed Rent:</span>
              <strong className="text-slate-900 dark:text-slate-100">{formatCurrency(activeRenewal.proposedRent)}</strong>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Requested Term:</span>
              <strong className="text-slate-900 dark:text-slate-100">{activeRenewal.duration || '12 months'}</strong>
            </div>
            {activeRenewal.renewalNumber && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                <span>Reference ID:</span>
                <strong className="text-blue-600 dark:text-blue-400">{activeRenewal.renewalNumber}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pt-2 flex flex-col sm:flex-row gap-2">
        {stateInfo.buttonText && stateInfo.action && (
          <button
            onClick={stateInfo.action}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-md ${stateInfo.buttonStyle}`}
          >
            <span>{stateInfo.buttonText}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {activeRenewal && ['requested', 'under_review', 'counter_offer'].includes(activeRenewal.status) && onCancelRenewal && (
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to cancel this renewal request?')) {
                onCancelRenewal(activeRenewal.id || activeRenewal._id);
              }
            }}
            className="px-4 py-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold transition cursor-pointer"
          >
            Cancel Request
          </button>
        )}
      </div>
    </div>
  );
}

export default RenewalStatusCard;
