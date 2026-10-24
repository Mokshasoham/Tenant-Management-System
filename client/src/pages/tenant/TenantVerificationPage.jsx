import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Award,
  FileText,
  History,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  User,
  Building,
  Home,
  Check,
  Zap,
  Lock,
  Calendar,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
import FeatureFlagService from '../../services/FeatureFlagService';
import { useLanguage } from '../../context/LanguageContext';
import useAuthStore from '../../context/authStore';
import { trackEvent, VERIFICATION_EVENTS } from '../../utils/verificationAnalytics';
import {
  mapVerification,
  mapTrustScore,
  mapTimeline,
  mapDocuments,
  mapRentalHistory,
  mapRenewalStatus,
} from '../../mappers/tenantVerificationMapper';
import { REQUIRED_DOC_TYPES } from '../../constants/verification/documentTypes';
import { leaseService, paymentService } from '../../services/api';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  VerificationStatusBadge,
  VerificationBadge,
  TrustScoreBadge,
  VerificationProgressCard,
  UploadRequirementsCard,
  VerificationTimeline,
  VerificationSkeleton,
  VerificationErrorState,
  CircularProgress,
  VerificationEmptyState,
} from '../../components/verification';
import { Button } from '../../components/PremiumUI';

export default function TenantVerificationPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const user = useAuthStore((state) => state.user);
  const { activeVerification, widgetData, loading, error, loadTenantVerification } = useVerificationContext();

  const [activeLeases, setActiveLeases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadTenantData = useCallback(async () => {
    if (!user) return;
    const userId = user.userId || user._id || user.id;
    setRefreshing(true);
    try {
      await Promise.allSettled([
        loadTenantVerification(userId),
        leaseService.getMyLease().then((res) => {
          const lData = res?.activeLeases || res?.leases || (res?.data ? (Array.isArray(res.data) ? res.data : [res.data]) : []);
          setActiveLeases(Array.isArray(lData) ? lData : []);
        }),
        paymentService.getMyPayments().then((res) => {
          const pData = res?.data || (Array.isArray(res) ? res : []);
          setPayments(Array.isArray(pData) ? pData : []);
        }),
      ]);
    } catch (e) {
      console.error('Failed to load tenant verification data:', e);
    } finally {
      setRefreshing(false);
    }
  }, [user, loadTenantVerification]);

  useEffect(() => {
    if (user) {
      loadTenantData();
      const userId = user.userId || user._id || user.id;
      trackEvent(VERIFICATION_EVENTS.VERIFICATION_STARTED, { userId, role: 'tenant' });
    }
  }, [user, loadTenantData]);

  if (loading && !activeVerification) {
    return (
      <div className="p-6 sm:p-10 space-y-6">
        <VerificationSkeleton />
        <VerificationSkeleton />
      </div>
    );
  }

  const isTenantVerificationEnabled = FeatureFlagService.isEnabled('TENANT_VERIFICATION', true);
  if (!isTenantVerificationEnabled) {
    return (
      <div className="p-6 sm:p-10">
        <VerificationErrorState error="Tenant Verification module is currently disabled by system feature flags." />
      </div>
    );
  }

  // Map state strictly from real backend records
  const verification = mapVerification(activeVerification, user);
  const trustData = mapTrustScore(activeVerification?.trustScoreData || widgetData, user, activeVerification);
  const timeline = mapTimeline(activeVerification?.timeline);
  const documents = mapDocuments(activeVerification?.documents);
  const rentalHistory = mapRentalHistory(activeVerification?.rentalHistory, activeLeases, payments);
  const renewal = mapRenewalStatus(activeVerification?.renewalStatus, activeVerification);

  const status = verification.status;
  const vrfNumber = verification.verificationNumber;
  const trustScore = trustData.score;
  const badge = trustData.badge;
  const tenantLevel = verification.tenantLevel;

  const uploadedDocTypes = documents
    .filter((d) => d.status !== 'REJECTED')
    .map((d) => d.documentType);

  return (
    <div className="p-6 sm:p-10 space-y-8">
      <VerificationPageHeader
        title={t('verification.headerTitle', 'Tenant Rental Verification & Trust Hub')}
        subtitle={t('verification.headerSubtitle', 'Build rental credibility, manage identity documents, track trust score, and view rental reputation')}
        icon={ShieldCheck}
        breadcrumbs={[{ label: t('verification.tenantPortal', 'Tenant Portal'), href: '/dashboard' }, { label: t('verification.verificationHome', 'Verification Home') }]}
        actionSlot={
          <Button variant="outline" type="button" onClick={loadTenantData} disabled={refreshing} className="text-xs">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            {t('verification.refreshData', 'Refresh Data')}
          </Button>
        }
      />

      {error && <VerificationErrorState error={error} onRetry={loadTenantData} />}

      {/* Enhancement #10: Notification Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
        status === 'APPROVED'
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
          : status === 'REJECTED'
          ? 'bg-rose-500/10 border-rose-500/20 text-rose-600'
          : status === 'DRAFT'
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
          : ['SUBMITTED', 'AUTO_REVIEW', 'MANAGER_REVIEW', 'ADMIN_REVIEW'].includes(status)
          ? 'bg-blue-500/10 border-blue-500/20 text-blue-600'
          : 'bg-sky-500/10 border-sky-500/20 text-sky-600'
      }`}>
        <div className="flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            {status === 'UNVERIFIED' && t('verification.unverifiedBanner', 'Start your rental verification to build credibility and speed up lease approvals.')}
            {status === 'DRAFT' && t('verification.draftBanner', 'You have an incomplete verification draft. Complete all steps to submit.')}
            {['SUBMITTED', 'AUTO_REVIEW', 'MANAGER_REVIEW', 'ADMIN_REVIEW'].includes(status) && t('verification.reviewBanner', 'Your verification application is under active review.')}
            {status === 'REJECTED' && t('verification.rejectedBanner', 'Your verification application requires attention. Review rejection remarks and resubmit.')}
            {status === 'APPROVED' && t('verification.approvedBanner', 'Your tenant profile is fully verified and certified.')}
            {status === 'EXPIRED' && t('verification.expiredBanner', 'Your verification credential has expired. Please initiate renewal.')}
          </span>
        </div>
        {status === 'UNVERIFIED' && (
          <Button
            variant="primary"
            className="text-xs shrink-0 ml-4 py-1.5 px-3"
            onClick={() => {
              trackEvent(VERIFICATION_EVENTS.VERIFICATION_STARTED);
              navigate('/tenant/verification/wizard');
            }}
          >
            {t('verification.startNow', 'Start Now')}
          </Button>
        )}
      </div>

      {/* Hero Overview Grid (3 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Card */}
        <VerificationSectionCard title={t('verification.currentStatus', 'Current Status')} subtitle={`VRF Sequence: ${vrfNumber}`} icon={ShieldCheck}>
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{t('verification.verificationState', 'Verification State')}</span>
              <VerificationStatusBadge status={status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{t('verification.trustBadge', 'Trust Badge')}</span>
              <VerificationBadge badge={badge} />
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-xs font-semibold text-muted-foreground">{t('verification.verificationLevel', 'Verification Level')}</span>
              <span className="text-xs font-black text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                {tenantLevel}
              </span>
            </div>

            {/* State-Driven Action Button */}
            <div className="pt-2">
              {status === 'UNVERIFIED' && (
                <Button
                  variant="primary"
                  className="w-full text-xs justify-between"
                  onClick={() => {
                    trackEvent(VERIFICATION_EVENTS.VERIFICATION_STARTED);
                    navigate('/tenant/verification/wizard');
                  }}
                >
                  <span>{t('verification.startVerification', 'Start Verification')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {status === 'DRAFT' && (
                <Button
                  variant="primary"
                  className="w-full text-xs justify-between"
                  onClick={() => {
                    trackEvent(VERIFICATION_EVENTS.DRAFT_RESUMED);
                    navigate('/tenant/verification/wizard');
                  }}
                >
                  <span>{t('verification.continueDraft', 'Continue Draft')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {status === 'REJECTED' && (
                <Button
                  variant="secondary"
                  className="w-full text-xs justify-between bg-rose-500 text-white hover:bg-rose-600"
                  onClick={() => {
                    trackEvent(VERIFICATION_EVENTS.VERIFICATION_RESUBMITTED);
                    navigate('/tenant/verification/wizard');
                  }}
                >
                  <span>{t('verification.resubmitVerification', 'Resubmit Verification')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {status === 'APPROVED' && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{t('verification.verifiedReady', 'Verified & Lease Ready')}</span>
                </div>
              )}

              {['SUBMITTED', 'AUTO_REVIEW', 'MANAGER_REVIEW', 'ADMIN_REVIEW'].includes(status) && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>{t('verification.underReview', 'Submission Under Active Review')}</span>
                </div>
              )}
            </div>
          </div>
        </VerificationSectionCard>

        {/* Enhanced Trust Score Hero */}
        <VerificationSectionCard title={t('verification.rentalTrustScore', 'Rental Trust Score')} subtitle={trustData.statusTitle} icon={Award}>
          <div className="flex flex-col items-center justify-center space-y-3 pt-1 text-center">
            <CircularProgress value={trustScore} max={100} size={110} strokeWidth={9} color="#10b981">
              <div className="text-center">
                <span className="text-2xl font-black text-foreground">{trustScore}</span>
                <span className="text-[10px] text-muted-foreground block font-semibold">/100</span>
              </div>
            </CircularProgress>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-500 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                {trustData.percentileText}
              </span>
              <TrustScoreBadge badge={badge} />
            </div>

            <Button
              variant="outline"
              className="text-xs w-full mt-1"
              onClick={() => {
                trackEvent(VERIFICATION_EVENTS.TRUST_VIEWED);
                navigate('/tenant/trust-score');
              }}
            >
              <span>{t('verification.viewScoreBreakdown', 'View Score Breakdown')}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </VerificationSectionCard>

        {/* Rental Reputation Card */}
        <VerificationSectionCard title={t('verification.rentalReputation', 'Rental Reputation')} subtitle={t('verification.reputationSubtitle', 'Track record & completed leases')} icon={Home}>
          <div className="space-y-3 pt-1 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">{t('verification.currentResidence', 'Current Residence')}</span>
              <span className="font-bold text-foreground truncate max-w-[170px]">{rentalHistory.currentResidence}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                <p className="text-[10px] text-muted-foreground font-semibold">{t('verification.yearsRenting', 'Years Renting')}</p>
                <p className="text-sm font-black text-foreground">{rentalHistory.yearsRenting}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                <p className="text-[10px] text-muted-foreground font-semibold">{t('verification.completedLeases', 'Completed Leases')}</p>
                <p className="text-sm font-black text-foreground">{rentalHistory.completedLeases}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">{t('verification.onTimeRate', 'On-Time Payment Rate')}</span>
              <span className="font-black text-emerald-500">{rentalHistory.onTimeRate}</span>
            </div>
          </div>
        </VerificationSectionCard>
      </div>

      {/* Account Verification Widget */}
      <VerificationSectionCard title={t('verification.accountWidget', 'Account Verification Widget')} subtitle={t('verification.securityIndicator', 'Security & trust readiness indicator')} icon={Zap}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-4 rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20">
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-foreground">{t('verification.rentalCredentialProfile', 'Rental Credential Profile')}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                {tenantLevel}
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-lg">
              {t('verification.credentialProfileDesc', 'Completing identity checks and uploading address proof unlocks faster lease approvals and elevates your trust score.')}
            </p>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-medium pt-1">
              <span>{t('verification.expiryTarget', 'Expiry Target')}: {renewal.expiresOn}</span>
              <span>•</span>
              <span>{t('verification.trustScore', 'Trust Score')}: {trustScore}/100</span>
            </div>
          </div>
          <Button
            variant="primary"
            className="text-xs whitespace-nowrap shrink-0"
            onClick={() => navigate('/tenant/verification/wizard')}
          >
            {status === 'UNVERIFIED' ? t('verification.startVerification', 'Start Verification') : t('verification.updateVerification', 'Update Verification')}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </VerificationSectionCard>

      {/* Rejection Warning Banner */}
      {status === 'REJECTED' && activeVerification?.verificationRemarks && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5" />
            <span>{t('verification.rejectionRemarks', 'Verification Rejection Remarks')}</span>
          </div>
          <p className="text-xs leading-relaxed">{activeVerification.verificationRemarks}</p>
          <Button
            variant="secondary"
            className="text-xs bg-rose-500 text-white mt-2"
            onClick={() => navigate('/tenant/verification/wizard')}
          >
            {t('verification.fixAndResubmit', 'Fix & Resubmit Now')}
          </Button>
        </div>
      )}

      {/* Content Grid (2 columns): Document Requirements & Timeline Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UploadRequirementsCard
          requiredTypes={REQUIRED_DOC_TYPES}
          documents={documents}
          uploadedTypes={uploadedDocTypes}
        />

        {/* Timeline Preview */}
        <VerificationSectionCard title={t('verification.recentActivity', 'Recent Activity Timeline')} subtitle={t('verification.auditTrailEvents', 'Audit trail events')} icon={History}>
          {timeline.length === 0 ? (
            <VerificationEmptyState
              icon={Clock}
              title={t('verification.noTimelineActivity', 'No Timeline Activity')}
              description={t('verification.noTimelineActivityDesc', 'Your verification audit history will appear here once you start.')}
            />
          ) : (
            <VerificationTimeline timeline={timeline.slice(0, 5)} />
          )}
        </VerificationSectionCard>
      </div>

      {/* Content Grid Row 2: Renewal Status & Profile Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Renewal Status */}
        <VerificationSectionCard title={t('verification.renewalLifecycle', 'Verification Renewal Lifecycle')} subtitle={t('verification.credentialValidityCountdown', 'Credential validity & expiry countdown')} icon={Clock}>
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-xs">
              <span className="font-semibold text-muted-foreground">{t('verification.currentCredentialExpiry', 'Current Credential Expiry')}</span>
              <span className="font-bold text-foreground">{renewal.expiresOn}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-xs">
              <span className="font-semibold text-muted-foreground">{t('verification.daysRemaining', 'Days Remaining')}</span>
              <span className="font-bold text-emerald-500">{renewal.daysRemaining} {t('common.days', 'Days')}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-xs">
              <span className="font-semibold text-muted-foreground">{t('verification.renewalStatus', 'Renewal Status')}</span>
              <span className="font-bold text-emerald-500">{renewal.statusLabel}</span>
            </div>
            <Button variant="outline" disabled className="w-full text-xs opacity-75 cursor-not-allowed">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              {t('verification.renewCredentialsSoon', 'Renew Credentials (Coming Soon in Production)')}
            </Button>
          </div>
        </VerificationSectionCard>

        {/* Profile Summary */}
        <VerificationSectionCard title={t('verification.tenantProfileSummary', 'Tenant Profile Summary')} subtitle={t('verification.registeredContactDetails', 'Registered contact details')} icon={User}>
          <div className="space-y-3 pt-1 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">{t('verification.tenantName', 'Tenant Name')}</span>
              <span className="font-bold text-foreground">{`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">{t('verification.emailAddress', 'Email Address')}</span>
              <span className="font-bold text-foreground">{user?.email || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">{t('verification.phoneNumber', 'Phone Number')}</span>
              <span className="font-bold text-foreground">{user?.phone || t('verification.notProvided', 'Not Provided')}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">{t('verification.occupation', 'Occupation')}</span>
              <span className="font-bold text-foreground">{user?.occupation || user?.employmentProfile?.occupation || activeVerification?.formData?.occupation || t('verification.notProvided', 'Not Provided')}</span>
            </div>
          </div>
        </VerificationSectionCard>
      </div>

      {/* Quick Navigation 2x2 Grid */}
      <VerificationSectionCard title={t('verification.quickNavigation', 'Quick Navigation')} subtitle={t('verification.accessSubModules', 'Access sub-modules')} icon={FileText}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <button
            type="button"
            onClick={() => navigate('/tenant/verification/documents')}
            className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted text-left transition-all group"
          >
            <FileText className="w-5 h-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-foreground">{t('verification.documents', 'Documents')}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t('verification.workspaceRepository', 'Workspace repository')}</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/tenant/trust-score')}
            className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted text-left transition-all group"
          >
            <Award className="w-5 h-5 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-foreground">{t('verification.trustAnalytics', 'Trust Analytics')}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t('verification.scoreAndTips', 'Score & tips')}</p>
          </button>

          <button
            type="button"
            onClick={() => {
              trackEvent(VERIFICATION_EVENTS.TIMELINE_VIEWED);
              navigate('/tenant/verification/timeline');
            }}
            className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted text-left transition-all group"
          >
            <History className="w-5 h-5 text-cyan-500 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-foreground">{t('verification.auditTimeline', 'Audit Timeline')}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t('verification.eventHistory', 'Event history')}</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/tenant/verification/wizard')}
            className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted text-left transition-all group"
          >
            <ShieldCheck className="w-5 h-5 text-violet-500 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-foreground">{t('verification.wizard', 'Wizard')}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{t('verification.stepByStepForm', 'Step-by-step form')}</p>
          </button>
        </div>
      </VerificationSectionCard>

      {/* Future Production Hooks */}
      <VerificationSectionCard title={t('verification.productionHooks', 'Production Integration Hooks')} subtitle={t('verification.featureFlaggedEnterprise', 'Feature-flagged enterprise capabilities')} icon={Lock}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="p-3 rounded-xl border border-border bg-muted/20 text-center opacity-60">
            <Lock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs font-bold text-foreground">DigiLocker</p>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t('common.comingSoon', 'Coming Soon')}</span>
          </div>
          <div className="p-3 rounded-xl border border-border bg-muted/20 text-center opacity-60">
            <Lock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs font-bold text-foreground">{t('verification.faceVerification', 'Face Verification')}</p>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t('common.comingSoon', 'Coming Soon')}</span>
          </div>
          <div className="p-3 rounded-xl border border-border bg-muted/20 text-center opacity-60">
            <Lock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs font-bold text-foreground">{t('verification.videoKyc', 'Video KYC')}</p>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t('common.comingSoon', 'Coming Soon')}</span>
          </div>
          <div className="p-3 rounded-xl border border-border bg-muted/20 text-center opacity-60">
            <Lock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs font-bold text-foreground">{t('verification.backgroundCheck', 'Background Check')}</p>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t('common.comingSoon', 'Coming Soon')}</span>
          </div>
          <div className="p-3 rounded-xl border border-border bg-muted/20 text-center opacity-60">
            <Lock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs font-bold text-foreground">{t('verification.employerCheck', 'Employer Check')}</p>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t('common.comingSoon', 'Coming Soon')}</span>
          </div>
        </div>
      </VerificationSectionCard>
    </div>
  );
}
