import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeaseRenewalDashboard } from './hooks/useLeaseRenewalDashboard';
import useAuthStore from '../../../context/authStore';
import SkeletonDashboard from './components/SkeletonDashboard';
import { Home, RefreshCw, ShieldAlert, ArrowLeft, AlertCircle, FileQuestion, Lock } from 'lucide-react';
import {
  RenewalHeader,
  RenewalProgress,
  CurrentLeaseCard,
  RenewalStatusCard,
  RenewalEligibilityCard,
  PaymentSummaryCard,
  MaintenanceSummaryCard,
  LeaseHealthCard,
  RenewalTimeline,
  RenewalActionCenter,
  LeaseDocumentsCard,
  QuickActionsCard,
  RenewalWizardModal,
  KycUploadModal,
  ManagerContactModal,
  LeaseDocumentPreviewModal,
  SignatureModal
} from '../../../components/leaseRenewal';

export const LeaseRenewalDashboard = () => {
  const navigate = useNavigate();
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

  // Modal States
  const [showWizard, setShowWizard] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [showManagerContact, setShowManagerContact] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <SkeletonDashboard />
      </div>
    );
  }

  // 1. Error state (Unauthorized / Not Found / Network error)
  if (error) {
    const isForbidden = error.statusCode === 403 || error.code === 'AUTH_FORBIDDEN';
    const isNotFound = error.statusCode === 404 || error.code === 'LEASE_NOT_FOUND';

    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-6 shadow-sm">
        <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center font-bold ${
          isForbidden 
            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800' 
            : isNotFound 
            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
        }`}>
          {isForbidden ? <Lock className="w-6 h-6" /> : isNotFound ? <FileQuestion className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {isForbidden ? 'Access Denied' : isNotFound ? 'Lease Not Found' : 'Unable to Load Renewal Workspace'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {isForbidden 
              ? 'You do not have authorization to view or renew this lease agreement. It is assigned to another resident or account.'
              : isNotFound 
              ? 'The requested lease agreement does not exist or may have been removed.'
              : (error.message || 'System diagnostic check failed.')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate('/my-lease')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to My Lease Agreement</span>
          </button>
          {!isForbidden && !isNotFound && (
            <button
              onClick={refresh}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-md cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Multiple active leases without selection or no active lease
  if (!data?.hasActiveLease) {
    if (data?.multipleLeases) {
      return (
        <div className="max-w-2xl mx-auto my-12 text-center p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
            <Home className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">No Lease Selected</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
              You have {data.activeLeasesCount || 'multiple'} active lease agreements. Please select which property you would like to extend in My Lease Agreement.
            </p>
          </div>
          <button
            onClick={() => navigate('/my-lease')}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl text-xs font-bold transition shadow-md cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Select Lease from My Lease Agreement</span>
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto my-12 text-center p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
        <Home className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-600" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">No Active Lease Agreement Found</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          We couldn't locate an active lease agreement linked to your account. Please contact your property manager to setup your tenancy details.
        </p>
        <button
          onClick={() => navigate('/my-lease')}
          className="inline-flex items-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go to My Lease Agreement</span>
        </button>
      </div>
    );
  }

  const {
    lease,
    property,
    tenant,
    manager,
    activeRenewal,
    payments,
    maintenance,
    healthScore,
    timeline,
    eligibility,
    documents
  } = data;

  const handlePreviewDoc = (doc) => {
    setSelectedDoc(doc);
    setShowDocPreview(true);
  };

  const handleDownloadDoc = (doc) => {
    setSelectedDoc(doc);
    setShowDocPreview(true);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* 1. Page Header */}
      <RenewalHeader
        lease={lease}
        property={property}
        activeRenewal={activeRenewal}
        eligibility={eligibility}
        onBack={() => navigate('/my-lease')}
      />

      {/* 2. Renewal Stepper Progress */}
      <RenewalProgress activeRenewal={activeRenewal} />

      {/* 3. Primary Grid: Current Lease & Renewal Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CurrentLeaseCard lease={lease} property={property} />
        <RenewalStatusCard
          activeRenewal={activeRenewal}
          eligibility={eligibility}
          onStartRenewal={() => setShowWizard(true)}
          onCancelRenewal={onCancelRenewal}
          onReviewAgreement={() => {
            setSelectedDoc({ name: `Renewal_Agreement_${activeRenewal?.renewalNumber || 'LRN'}.pdf`, category: 'renewal_agreement' });
            setShowDocPreview(true);
          }}
          onSignAgreement={() => setShowSignatureModal(true)}
        />
      </div>

      {/* 4. Renewal Eligibility Criteria */}
      <RenewalEligibilityCard eligibility={eligibility} />

      {/* 5. Payments & Maintenance Standing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PaymentSummaryCard payments={payments} rentAmount={lease.rentAmount} />
        <MaintenanceSummaryCard maintenance={maintenance} />
      </div>

      {/* 6. Lease Health & Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LeaseHealthCard healthScore={healthScore} daysRemaining={lease.daysRemaining} />
        <LeaseDocumentsCard
          documents={documents}
          onPreview={handlePreviewDoc}
          onDownload={handleDownloadDoc}
        />
      </div>

      {/* 7. Action Center / Negotiation Thread (if active renewal exists) */}
      {activeRenewal && (
        <RenewalActionCenter
          activeRenewal={activeRenewal}
          currentRent={lease.rentAmount}
          onCounterOffer={onCounterRenewal}
          onPostMessage={onPostMessage}
          onApproveTerms={onApproveRenewal}
        />
      )}

      {/* 8. Audit Timeline */}
      <RenewalTimeline timeline={timeline} />

      {/* 9. Quick Actions & Support Help */}
      <QuickActionsCard
        onOpenKyc={() => setShowKycModal(true)}
        onOpenManagerContact={() => setShowManagerContact(true)}
      />

      {/* Modals */}
      <RenewalWizardModal
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        lease={lease}
        property={property}
        onSubmitRequest={onRequestRenewal}
      />

      <KycUploadModal
        isOpen={showKycModal}
        onClose={() => setShowKycModal(false)}
      />

      <ManagerContactModal
        isOpen={showManagerContact}
        onClose={() => setShowManagerContact(false)}
        manager={manager}
      />

      <LeaseDocumentPreviewModal
        isOpen={showDocPreview}
        onClose={() => setShowDocPreview(false)}
        document={selectedDoc}
      />

      <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        activeRenewal={activeRenewal}
        onSign={onSignRenewal}
      />
    </div>
  );
};

export default LeaseRenewalDashboard;
