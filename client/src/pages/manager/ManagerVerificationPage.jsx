import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Award, FileText, History, Clock, ArrowRight, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
import FeatureFlagService from '../../services/FeatureFlagService';
import { canEditDraft, canSubmit, canResubmit } from '../../utils/verificationPermissions';
import useAuthStore from '../../context/authStore';
import { VERIFICATION_ROUTES } from '../../constants/routes/verificationRoutes';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  VerificationStatusBadge,
  VerificationBadge,
  TrustScoreBadge,
  VerificationProgressCard,
  TrustScoreCard,
  UploadRequirementsCard,
  VerificationTimeline,
  VerificationSkeleton,
  VerificationErrorState,
} from '../../components/verification';
import { Button } from '../../components/PremiumUI';

export default function ManagerVerificationPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { activeVerification, widgetData, loading, error, refresh, loadWidget } = useVerificationContext();

  useEffect(() => {
    if (user) {
      const userId = user.userId || user._id || user.id;
      loadWidget('MANAGER', userId);
      refresh();
    }
  }, [user, loadWidget, refresh]);

  if (loading && !activeVerification) {
    return (
      <div className="p-6 sm:p-10 space-y-6">
        <VerificationSkeleton />
        <VerificationSkeleton />
      </div>
    );
  }

  const isManagerVerificationEnabled = FeatureFlagService.isEnabled('MANAGER_VERIFICATION', true);
  if (!isManagerVerificationEnabled) {
    return (
      <div className="p-6 sm:p-10">
        <VerificationErrorState error="Manager Verification module is currently disabled by system feature flags." />
      </div>
    );
  }

  const status = activeVerification?.status || 'UNVERIFIED';
  const vrfNumber = activeVerification?.verificationNumber || 'Not Issued';
  const trustScore = activeVerification?.trustScore || user?.currentTrustScore || 0;
  const badge = user?.verificationBadge || 'UNVERIFIED';

  const requiredDocTypes = [
    { type: 'BUSINESS_REGISTRATION', name: 'Business Registration Certificate' },
    { type: 'TAX_PIN', name: 'GST / Tax Identification PIN' },
    { type: 'GOVT_ID', name: 'Manager Govt Photo ID' },
  ];

  const uploadedDocTypes = (activeVerification?.documents || [])
    .filter((d) => d.status !== 'REJECTED')
    .map((d) => d.documentType);

  const sampleTimeline = activeVerification?.timeline || [
    { action: 'Profile Registered', timestamp: user?.createdAt || new Date(), remarks: 'Manager account active' },
  ];

  return (
    <div className="p-6 sm:p-10 space-y-8">
      <VerificationPageHeader
        title="Manager Verification Home"
        subtitle="Manage business credentials, identity proofs, trust score, and compliance badges"
        icon={ShieldCheck}
        breadcrumbs={[{ label: 'Manager Portal', href: '/dashboard' }, { label: 'Verification Home' }]}
        actionSlot={
          <Button variant="outline" type="button" onClick={() => refresh(activeVerification?._id)} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh Data
          </Button>
        }
      />

      {error && <VerificationErrorState error={error} onRetry={refresh} />}

      {/* Hero Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Card */}
        <VerificationSectionCard title="Current Status" subtitle={`VRF Sequence: ${vrfNumber}`} icon={ShieldCheck}>
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Verification State</span>
              <VerificationStatusBadge status={status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Trust Badge</span>
              <VerificationBadge badge={badge} />
            </div>

            {/* State Driven Quick Action Button */}
            <div className="pt-2">
              {status === 'UNVERIFIED' && (
                <Button
                  variant="primary"
                  className="w-full text-xs justify-between"
                  onClick={() => navigate('/manager/verification/wizard')}
                >
                  <span>Start Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {status === 'DRAFT' && (
                <Button
                  variant="primary"
                  className="w-full text-xs justify-between"
                  onClick={() => navigate('/manager/verification/wizard')}
                >
                  <span>Continue Draft</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {status === 'REJECTED' && (
                <Button
                  variant="secondary"
                  className="w-full text-xs justify-between bg-rose-500 text-white hover:bg-rose-600"
                  onClick={() => navigate('/manager/verification/wizard')}
                >
                  <span>Resubmit Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {status === 'APPROVED' && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Account Fully Verified & Certified</span>
                </div>
              )}

              {['SUBMITTED', 'AUTO_REVIEW', 'MANAGER_REVIEW', 'ADMIN_REVIEW'].includes(status) && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>Submission Under Active Review</span>
                </div>
              )}
            </div>
          </div>
        </VerificationSectionCard>

        {/* Trust Score Card */}
        <TrustScoreCard score={trustScore} badge={badge} />

        {/* Progress Card */}
        <VerificationProgressCard
          verification={activeVerification || { status }}
          completedStepsCount={uploadedDocTypes.length}
          totalStepsCount={requiredDocTypes.length}
        />
      </div>

      {/* Rejection Warning Banner */}
      {status === 'REJECTED' && activeVerification?.verificationRemarks && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5" />
            <span>Verification Rejection Remarks</span>
          </div>
          <p className="text-xs leading-relaxed">{activeVerification.verificationRemarks}</p>
          <Button
            variant="secondary"
            className="text-xs bg-rose-500 text-white mt-2"
            onClick={() => navigate('/manager/verification/wizard')}
          >
            Fix & Resubmit Now
          </Button>
        </div>
      )}

      {/* Document & Quick Link Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UploadRequirementsCard requiredTypes={requiredDocTypes} uploadedTypes={uploadedDocTypes} />

        {/* Verification Renewal Lifecycle Placeholder */}
        <VerificationSectionCard title="Verification Renewal Lifecycle" subtitle="Document validity & annual renewal schedule" icon={Clock}>
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-xs">
              <span className="font-semibold text-muted-foreground">Current Credential Expiry</span>
              <span className="font-bold text-foreground">12 Dec 2027</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-xs">
              <span className="font-semibold text-muted-foreground">Renewal Status</span>
              <span className="font-bold text-emerald-500">Not Required (Valid)</span>
            </div>
            <Button variant="outline" disabled className="w-full text-xs opacity-75 cursor-not-allowed">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Renew Credentials (Coming Soon)
            </Button>
          </div>
        </VerificationSectionCard>

        <VerificationSectionCard title="Quick Navigation" subtitle="Access verification sub-modules" icon={FileText}>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => navigate('/manager/verification/documents')}
              className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted text-left transition-all group"
            >
              <FileText className="w-5 h-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-foreground">Document Workspace</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Upload & manage business files</p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/manager/trust-score')}
              className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted text-left transition-all group"
            >
              <Award className="w-5 h-5 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-foreground">Trust Score Analytics</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Breakdown & improvement tips</p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/manager/verification/timeline')}
              className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted text-left transition-all group"
            >
              <History className="w-5 h-5 text-cyan-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-foreground">Audit Timeline</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Chronological review history</p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/manager/verification/wizard')}
              className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted text-left transition-all group"
            >
              <ShieldCheck className="w-5 h-5 text-violet-500 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-foreground">Verification Wizard</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Multi-step form wizard</p>
            </button>
          </div>
        </VerificationSectionCard>
      </div>

      {/* Timeline Preview */}
      <VerificationSectionCard title="Recent Activity Timeline" subtitle="Audit trail events" icon={History}>
        <VerificationTimeline timeline={sampleTimeline} />
      </VerificationSectionCard>
    </div>
  );
}
