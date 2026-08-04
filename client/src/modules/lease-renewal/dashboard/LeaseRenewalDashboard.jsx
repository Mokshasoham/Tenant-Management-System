import React, { useState } from 'react';
import { useLeaseRenewalDashboard } from './hooks/useLeaseRenewalDashboard';
import useAuthStore from '../../../context/authStore';
import SkeletonDashboard from './components/SkeletonDashboard';
import EmptyRenewalState from './components/EmptyRenewalState';
import LeaseSummaryCard from './components/LeaseSummaryCard';
import RenewalStatusCard from './components/RenewalStatusCard';
import LeaseHealthCard from './components/LeaseHealthCard';
import PaymentSummaryCard from './components/PaymentSummaryCard';
import MaintenanceSummaryCard from './components/MaintenanceSummaryCard';
import TimelineCard from './components/TimelineCard';
import UpcomingActionsCard from './components/UpcomingActionsCard';
import QuickActionsCard from './components/QuickActionsCard';
import DocumentsCard from './components/DocumentsCard';
import RecentActivityCard from './components/RecentActivityCard';
import RenewalEligibilityCard from './components/RenewalEligibilityCard';
import NegotiationWorkspace from './components/NegotiationWorkspace';
import { Calendar, Home, RefreshCw, X } from 'lucide-react';
import { formatCurrency } from './utils/dashboardHelpers';

export const LeaseRenewalDashboard = () => {
  const { 
    data, 
    loading, 
    error, 
    refresh, 
    onRequestRenewal, 
    onCancelRenewal,
    onCounterRenewal,
    onPostMessage,
    onApproveRenewal,
    onSignRenewal
  } = useLeaseRenewalDashboard();
  const user = useAuthStore((state) => state.user);
  const [showWizard, setShowWizard] = useState(false);
  const [proposedRent, setProposedRent] = useState('');
  const [duration, setDuration] = useState('12 months');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [wizardError, setWizardError] = useState(null);

  if (loading) {
    return <SkeletonDashboard />;
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl text-center space-y-6 shadow-sm">
        <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center font-bold text-xl">
          !
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Failed to load Dashboard</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{error.message || 'System diagnostic check failed.'}</p>
          <span className="block text-[10px] text-slate-450 dark:text-slate-550">Support ID: {error.code || 'ERR_500'}</span>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition"
          aria-label="Retry loading dashboard"
        >
          <RefreshCw size={16} />
          <span>Retry Check</span>
        </button>
      </div>
    );
  }

  if (!data?.hasActiveLease) {
    return (
      <div className="max-w-2xl mx-auto my-12 text-center p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
        <Home size={48} className="mx-auto text-slate-300 dark:text-slate-600" />
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">No Active Lease Found</h3>
        <p className="text-slate-500 dark:text-slate-400">
          We couldn't locate an active lease agreement for your account. Please contact your property manager to create a lease.
        </p>
      </div>
    );
  }

  const { lease, property, tenant, activeRenewal, payments, maintenance, healthScore, timeline, eligibility, documents, recentActivities } = data;

  const handleSubmitRenewal = async (e) => {
    e.preventDefault();
    setWizardError(null);
    setSubmitting(true);

    try {
      const rentValue = Number(proposedRent) || lease.rentAmount;
      const start = new Date(lease.endDate);
      start.setDate(start.getDate() + 1);
      
      const end = new Date(start);
      if (duration === '12 months') end.setMonth(end.getMonth() + 12);
      else if (duration === '6 months') end.setMonth(end.getMonth() + 6);
      else end.setMonth(end.getMonth() + 24);

      await onRequestRenewal({
        leaseId: lease.id,
        duration,
        proposedRent: rentValue,
        requestedStartDate: start.toISOString().split('T')[0],
        requestedEndDate: end.toISOString().split('T')[0],
        message
      });

      setShowWizard(false);
      setProposedRent('');
      setMessage('');
    } catch (err) {
      setWizardError(err.message || 'Failed to submit renewal request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">
      {/* 1. Header Grid */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-805 dark:text-slate-100">
            Welcome back, {tenant?.name || 'Tenant'}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
            <span className="font-semibold">{property?.name}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span>Unit {property?.unitNumber}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
            Lease Active
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-550 font-medium">
            {lease.daysRemaining} Days Remaining
          </span>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <LeaseSummaryCard lease={lease} />
        
        {activeRenewal ? (
          <RenewalStatusCard renewal={activeRenewal} onCancel={onCancelRenewal} />
        ) : (
          <EmptyRenewalState
            lease={lease}
            eligibility={eligibility}
            onStartRenewal={() => setShowWizard(true)}
          />
        )}

        <LeaseHealthCard score={healthScore} />
      </div>

      {/* 3. Detailed Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Double Columns */}
        <div className="md:col-span-2 space-y-6">
          {activeRenewal ? (
            <NegotiationWorkspace
              renewal={activeRenewal}
              lease={lease}
              user={user}
              onCounter={(payload) => onCounterRenewal(activeRenewal.id || activeRenewal._id, payload)}
              onApprove={() => onApproveRenewal(activeRenewal.id || activeRenewal._id)}
              onSign={(sig) => onSignRenewal(activeRenewal.id || activeRenewal._id, sig)}
              onPostMessage={(content) => onPostMessage(activeRenewal.id || activeRenewal._id, content)}
              refresh={refresh}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PaymentSummaryCard payments={payments} rentAmount={lease.rentAmount} />
              <MaintenanceSummaryCard maintenance={maintenance} />
            </div>
          )}

          {!activeRenewal && <TimelineCard timeline={timeline} />}
        </div>

        {/* Right Single Column */}
        <div className="space-y-6">
          <RenewalEligibilityCard eligibility={eligibility} />
          <UpcomingActionsCard eligibility={eligibility} activeRenewal={activeRenewal} />
        </div>
      </div>

      {/* 4. Bottom Utilities Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionsCard
          onStartRenewal={() => setShowWizard(true)}
          onViewLease={() => alert('Opening lease documents preview...')}
          onUploadDoc={() => alert('Redirecting to KYC uploads...')}
          eligibility={eligibility}
        />
        <DocumentsCard documents={documents} />
        <RecentActivityCard activities={recentActivities} />
      </div>

      {/* Renewal Request Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative space-y-6">
            <button
              onClick={() => setShowWizard(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-805 dark:text-slate-100">Submit Renewal Request</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Initiate a lease renewal request. Proposed terms will be sent to your manager.
              </p>
            </div>

            {wizardError && (
              <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 p-3.5 rounded-xl text-xs border border-rose-100/50">
                {wizardError}
              </div>
            )}

            <form onSubmit={handleSubmitRenewal} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Proposed Monthly Rent
                </label>
                <input
                  type="number"
                  placeholder={lease.rentAmount.toString()}
                  value={proposedRent}
                  onChange={(e) => setProposedRent(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Renewal Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
                >
                  <option value="12 months">12 Months (Standard)</option>
                  <option value="6 months">6 Months (Short Term)</option>
                  <option value="24 months">24 Months (Long Term)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Optional Message
                </label>
                <textarea
                  placeholder="Would love to renew for another year..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWizard(false)}
                  className="flex-1 border border-slate-100 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-105 text-slate-700 dark:text-slate-300 font-semibold px-4 py-3 rounded-2xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary hover:bg-primary-hover text-white font-semibold px-4 py-3 rounded-2xl text-sm transition shadow-lg shadow-primary/20"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaseRenewalDashboard;
