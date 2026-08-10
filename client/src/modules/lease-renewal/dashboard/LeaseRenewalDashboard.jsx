import React, { useState } from 'react';
import { useLeaseRenewalDashboard } from './hooks/useLeaseRenewalDashboard';
import useAuthStore from '../../../context/authStore';
import SkeletonDashboard from './components/SkeletonDashboard';
import { Home, RefreshCw } from 'lucide-react';
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

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-6 shadow-sm">
        <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center font-bold text-xl">
          !
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Unable to load renewal workspace</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{error.message || 'System diagnostic check failed.'}</p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-md active:scale-95 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  if (!data?.hasActiveLease) {
    return (
      <div className="max-w-2xl mx-auto my-12 text-center p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
        <Home className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-600" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">No Active Lease Agreement Found</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          We couldn't locate an active lease agreement linked to your account. Please contact your property manager to setup your tenancy details.
        </p>
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
        activeRenewal={activeRenewal}
        eligibility={eligibility}
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

      {/* 6. Lease Lifecycle Timeline */}
      <RenewalTimeline timeline={timeline} activeRenewal={activeRenewal} lease={lease} />

      {/* 7. Documents Workspace & Dynamic Action Center */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LeaseDocumentsCard
          documents={documents}
          lease={lease}
          activeRenewal={activeRenewal}
          onPreviewDocument={handlePreviewDoc}
          onDownloadDocument={handleDownloadDoc}
        />
        <RenewalActionCenter
          user={user}
          payments={payments}
          eligibility={eligibility}
          activeRenewal={activeRenewal}
          onUploadKyc={() => setShowKycModal(true)}
          onStartRenewal={() => setShowWizard(true)}
        />
      </div>

      {/* 8. Quick Actions & Lease Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <QuickActionsCard
            onStartRenewal={() => setShowWizard(true)}
            onViewLease={() => {
              setSelectedDoc({ name: 'Current Lease Agreement.pdf', category: 'lease' });
              setShowDocPreview(true);
            }}
            onDownloadDraft={() => {
              setSelectedDoc({ name: `Renewal_Draft_${activeRenewal?.renewalNumber || 'LRN'}.pdf`, category: 'renewal_agreement' });
              setShowDocPreview(true);
            }}
            onUploadKyc={() => setShowKycModal(true)}
            onContactManager={() => setShowManagerContact(true)}
            onViewTimeline={() => {
              const el = document.getElementById('lease-timeline-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            activeRenewal={activeRenewal}
            eligibility={eligibility}
          />
        </div>

        <div>
          <LeaseHealthCard score={healthScore} hasData={true} />
        </div>
      </div>

      {/* Modals Workspace */}
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
        onSuccess={refresh}
      />

      <ManagerContactModal
        isOpen={showManagerContact}
        onClose={() => setShowManagerContact(false)}
        manager={manager}
        activeRenewal={activeRenewal}
        onPostRenewalMessage={(msg) => onPostMessage(activeRenewal?.id || activeRenewal?._id, msg)}
      />

      <LeaseDocumentPreviewModal
        isOpen={showDocPreview}
        onClose={() => setShowDocPreview(false)}
        document={selectedDoc}
        lease={lease}
        property={property}
        tenant={tenant}
        activeRenewal={activeRenewal}
      />

      <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        activeRenewal={activeRenewal}
        onSignAgreement={(sig) => onSignRenewal(activeRenewal?.id || activeRenewal?._id, sig)}
      />
    </div>
  );
};

export default LeaseRenewalDashboard;
