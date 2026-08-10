import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Check, FileText, Calendar, DollarSign, Building } from 'lucide-react';

const formatCurrency = (val) => {
  if (val === undefined || val === null) return '₹0';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
};

export function RenewalWizardModal({
  isOpen,
  onClose,
  lease,
  property,
  onSubmitRequest
}) {
  const [step, setStep] = useState(1);
  const [duration, setDuration] = useState('12 months');
  const [proposedRent, setProposedRent] = useState(lease?.rentAmount ? String(lease.rentAmount) : '');
  const [message, setMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !lease) return null;

  const currentRent = lease.rentAmount || 0;
  const numericRent = Number(proposedRent) || currentRent;
  const rentDifference = numericRent - currentRent;

  // Calculate start & end dates based on duration
  const startDate = new Date(lease.endDate);
  startDate.setDate(startDate.getDate() + 1);

  const calculateEndDate = (term) => {
    const d = new Date(startDate);
    if (term === '6 months') d.setMonth(d.getMonth() + 6);
    else if (term === '18 months') d.setMonth(d.getMonth() + 18);
    else if (term === '24 months') d.setMonth(d.getMonth() + 24);
    else d.setMonth(d.getMonth() + 12);
    return d;
  };

  const endDate = calculateEndDate(duration);

  const formatDate = (dateObj) => {
    return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmitRequest({
        leaseId: lease.id || lease._id,
        duration,
        proposedRent: numericRent,
        requestedStartDate: startDate.toISOString().split('T')[0],
        requestedEndDate: endDate.toISOString().split('T')[0],
        message
      });
      setShowConfirmModal(false);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit renewal request.');
      setShowConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl relative space-y-6 animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Tenant Renewal Workspace</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Step {step} of 3 — {step === 1 ? 'Renewal Overview' : step === 2 ? 'Choose Renewal Terms' : 'Final Review'}
          </p>
        </div>

        {/* Stepper Header */}
        <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className={`p-2 rounded-xl text-center text-xs font-bold ${step === 1 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-slate-50 text-slate-500 dark:bg-slate-800'}`}>
            1. Overview
          </div>
          <div className={`p-2 rounded-xl text-center text-xs font-bold ${step === 2 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-slate-50 text-slate-500 dark:bg-slate-800'}`}>
            2. Terms
          </div>
          <div className={`p-2 rounded-xl text-center text-xs font-bold ${step === 3 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-slate-50 text-slate-500 dark:bg-slate-800'}`}>
            3. Review
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 text-xs">
            {error}
          </div>
        )}

        {/* Step 1 — Renewal Overview */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
                <span className="text-slate-500">Property & Unit:</span>
                <strong className="text-slate-900 dark:text-slate-100">{property?.name || 'Property'} (Unit {property?.unitNumber || 'N/A'})</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Current Rent:</span>
                <strong className="text-slate-900 dark:text-slate-100">{formatCurrency(currentRent)} / month</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Security Deposit:</span>
                <strong className="text-slate-900 dark:text-slate-100">{formatCurrency(lease.securityDeposit)}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Current Lease Ends:</span>
                <strong className="text-slate-900 dark:text-slate-100">{formatDate(new Date(lease.endDate))}</strong>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
              <p className="font-semibold">Ready to lock in your next term?</p>
              <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                Continuing will allow you to select your preferred duration and review proposed rental terms before submitting to your property manager.
              </p>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
            >
              <span>Continue to Renewal Terms</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2 — Renewal Terms */}
        {step === 2 && (
          <div className="space-y-4 text-xs">
            <div className="space-y-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Choose Renewal Term
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['6 months', '12 months', '18 months'].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setDuration(term)}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                      duration === term
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {term.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                New Monthly Rent (₹)
              </label>
              <input
                type="number"
                value={proposedRent}
                onChange={(e) => setProposedRent(e.target.value)}
                placeholder={String(currentRent)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:border-blue-500"
              />
              <div className="flex justify-between items-center text-[11px] pt-0.5">
                <span className="text-slate-500">Rent Change:</span>
                <span className={`font-bold ${rentDifference > 0 ? 'text-amber-600' : rentDifference < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {rentDifference > 0 ? `+${formatCurrency(rentDifference)} / month` : rentDifference < 0 ? `${formatCurrency(rentDifference)} / month` : 'No change'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Calculated Start Date:</span>
                <strong className="text-slate-900 dark:text-slate-100">{formatDate(startDate)}</strong>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Calculated End Date:</span>
                <strong className="text-slate-900 dark:text-slate-100">{formatDate(endDate)}</strong>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
              >
                <span>Review Renewal Summary</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Final Review */}
        {step === 3 && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800 pb-2">
                RENEWAL SUMMARY
              </h4>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Property & Unit</span>
                  <strong className="text-slate-900 dark:text-slate-100">{property?.name || 'Property'} Unit {property?.unitNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Renewal Term</span>
                  <strong className="text-slate-900 dark:text-slate-100">{duration}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Current Rent</span>
                  <strong className="text-slate-900 dark:text-slate-100">{formatCurrency(currentRent)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Renewal Rent</span>
                  <strong className="text-blue-600 dark:text-blue-400">{formatCurrency(numericRent)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Start Date</span>
                  <strong className="text-slate-900 dark:text-slate-100">{formatDate(startDate)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">End Date</span>
                  <strong className="text-slate-900 dark:text-slate-100">{formatDate(endDate)}</strong>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase">
                Message to Property Manager (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add any specific comments for your manager..."
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                ← Back
              </button>
              <button
                onClick={() => setShowConfirmModal(true)}
                className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Submit Renewal Request</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal Guard */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scale-up text-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Submit Renewal Request?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You are requesting a renewal for <strong>{property?.name} (Unit {property?.unitNumber})</strong> for <strong>{duration}</strong> at <strong>{formatCurrency(numericRent)}/month</strong>.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RenewalWizardModal;
