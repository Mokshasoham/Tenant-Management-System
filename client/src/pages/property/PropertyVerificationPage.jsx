import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Building,
  Home,
  Zap,
  Lock,
  Calendar,
  AlertCircle,
  Activity,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
import FeatureFlagService from '../../services/FeatureFlagService';
import useAuthStore from '../../context/authStore';
import { trackEvent, VERIFICATION_EVENTS } from '../../utils/verificationAnalytics';
import getVerificationMapper from '../../mappers/verificationMapperFactory';
import { MOCK_REQUIRED_DOCUMENTS } from '../../mocks/propertyVerificationMock';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  VerificationStatusBadge,
  VerificationBadge,
  TrustScoreBadge,
  UploadRequirementsCard,
  VerificationTimeline,
  VerificationSkeleton,
  VerificationErrorState,
  CircularProgress,
  VerificationEmptyState,
} from '../../components/verification';
import { Button } from '../../components/PremiumUI';
import apiClient from '../../services/apiClient';

export default function PropertyVerificationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const { activeVerification, loading: contextLoading, error: contextError, refresh, loadWidget } = useVerificationContext();

  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [propertyError, setPropertyError] = useState(null);

  const propertyMapper = getVerificationMapper('PROPERTY');

  // 1. Fetch Manager's Real Properties
  const fetchManagerProperties = useCallback(async () => {
    setLoadingProperties(true);
    setPropertyError(null);
    try {
      const res = await apiClient.get('/properties');
      const propList = res?.data?.data || res?.data || res || [];
      const validProps = Array.isArray(propList) ? propList : [];
      setProperties(validProps);

      // Pre-select property from URL query or first available property
      const queryPropId = searchParams.get('propertyId');
      if (queryPropId && validProps.some((p) => String(p._id) === String(queryPropId))) {
        setSelectedPropertyId(queryPropId);
      } else if (validProps.length > 0) {
        setSelectedPropertyId(validProps[0]._id);
      }
    } catch (err) {
      console.error('[PropertyVerificationPage] Failed to fetch properties:', err);
      setPropertyError('Failed to load manager properties.');
    } finally {
      setLoadingProperties(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchManagerProperties();
  }, [fetchManagerProperties]);

  // 2. Load Verification Data for Selected Property
  useEffect(() => {
    if (selectedPropertyId && user) {
      const userId = user.userId || user._id || user.id;
      loadWidget('PROPERTY', selectedPropertyId);
      refresh();
      trackEvent(VERIFICATION_EVENTS.PROPERTY_STARTED, { userId, propertyId: selectedPropertyId, role: user?.role });
    }
  }, [selectedPropertyId, user, loadWidget, refresh]);

  if (loadingProperties) {
    return (
      <div className="p-6 sm:p-10 space-y-6">
        <VerificationSkeleton />
        <VerificationSkeleton />
      </div>
    );
  }

  const isPropertyVerificationEnabled = FeatureFlagService.isEnabled('PROPERTY_VERIFICATION', true);
  if (!isPropertyVerificationEnabled) {
    return (
      <div className="p-6 sm:p-10">
        <VerificationErrorState error="Property Verification module is currently disabled by system feature flags." />
      </div>
    );
  }

  // 3. ZERO-PROPERTIES ONBOARDING STATE (No Crash, Clean State)
  if (!loadingProperties && properties.length === 0) {
    return (
      <div className="p-6 sm:p-10 space-y-8">
        <VerificationPageHeader
          title="Property Verification & Trust Portal"
          subtitle="Verify real estate ownership, tax compliance, building safety, and physical inspection metrics"
          icon={Building}
          breadcrumbs={[{ label: 'Property Operations', href: '/properties' }, { label: 'Property Verification' }]}
        />

        <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-card/40 backdrop-blur-sm max-w-2xl mx-auto my-12 space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <Building className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Property Verification</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              No property is available for verification yet. Add your first property to begin the verification process.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              onClick={() => navigate('/properties')}
              className="px-6 py-2.5 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Property</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const selectedProperty = properties.find((p) => String(p._id) === String(selectedPropertyId)) || properties[0];

  // Resolve mapped domain models via Mapper Factory safely
  const verification = propertyMapper.mapVerification(activeVerification);
  const trustData = propertyMapper.mapTrustScore(activeVerification?.trustScoreData);
  const timeline = propertyMapper.mapTimeline(activeVerification?.timeline);
  const documents = propertyMapper.mapDocuments(activeVerification?.documents);
  const summary = propertyMapper.mapPropertySummary(activeVerification?.propertySummary || selectedProperty);
  const renewal = propertyMapper.mapRenewalStatus(activeVerification?.renewalStatus);
  const levelProgress = propertyMapper.mapPropertyLevels(activeVerification?.propertyLevels);
  const healthScore = propertyMapper.mapPropertyHealth(activeVerification?.propertyHealth);

  const status = verification.status || 'UNVERIFIED';
  const vrfNumber = verification.verificationNumber || 'N/A';
  const trustScore = trustData.score || 0;
  const badge = trustData.badge || 'UNVERIFIED';
  const propertyLevel = verification.propertyLevel || 'Unverified Property';

  const uploadedDocTypes = (documents || [])
    .filter((d) => d && d.status !== 'REJECTED')
    .map((d) => d.documentType);

  const nextReq = (levelProgress.requirementsToNextLevel && levelProgress.requirementsToNextLevel[0]) || 'Upload Title Deed';

  return (
    <div className="p-6 sm:p-10 space-y-8">
      <VerificationPageHeader
        title="Property Verification & Trust Portal"
        subtitle="Verify real estate ownership, tax compliance, building safety, and physical inspection metrics"
        icon={Building}
        breadcrumbs={[{ label: 'Property Operations', href: '/properties' }, { label: 'Property Verification' }]}
        actionSlot={
          <Button variant="outline" type="button" onClick={() => refresh(activeVerification?._id)} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh Data
          </Button>
        }
      />

      {/* Property Selector Bar when manager owns multiple properties */}
      {properties.length > 1 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card/50 border border-border">
          <div className="flex items-center gap-3">
            <Building className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <span className="text-xs font-bold text-foreground block">Active Property Workspace</span>
              <span className="text-[10px] text-muted-foreground">Select a property to view or update its certification</span>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-muted/60 border border-border text-xs font-bold text-foreground focus:outline-none focus:border-primary"
            >
              {properties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} — {p.address || 'Managed Property'}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {(propertyError || contextError) && (
        <VerificationErrorState error={propertyError || contextError} onRetry={fetchManagerProperties} />
      )}

      {/* State-Driven Notification Banner */}
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
            {status === 'UNVERIFIED' && `Start verifying "${selectedProperty?.name || 'your property'}" to certify ownership and increase tenant inquiries.`}
            {status === 'DRAFT' && 'Your property verification draft is incomplete. Upload remaining ownership documents.'}
            {['SUBMITTED', 'AUTO_REVIEW', 'MANAGER_REVIEW', 'ADMIN_REVIEW'].includes(status) && 'Your property verification application is under legal and physical review.'}
            {status === 'REJECTED' && 'Property verification rejected — please upload corrected ownership deed or tax receipt.'}
            {status === 'APPROVED' && 'This property is fully verified, certified, and compliant.'}
            {status === 'EXPIRED' && 'Property verification target expired. Initiate annual compliance renewal.'}
          </span>
        </div>
        {status === 'UNVERIFIED' && (
          <Button
            variant="primary"
            className="text-xs shrink-0 ml-4 py-1.5 px-3"
            onClick={() => {
              trackEvent(VERIFICATION_EVENTS.PROPERTY_STARTED);
              navigate(`/property/verification/wizard?propertyId=${selectedProperty?._id || ''}`);
            }}
          >
            Verify Property
          </Button>
        )}
      </div>

      {/* Hero Overview Grid (3 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Status & Progression */}
        <VerificationSectionCard title="Verification Status" subtitle={`VRF Sequence: ${vrfNumber}`} icon={ShieldCheck}>
          <div className="space-y-3.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Verification State</span>
              <VerificationStatusBadge status={status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Property Badge</span>
              <VerificationBadge badge={badge} />
            </div>

            {/* Property Verification Level & Progression */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Current Level</span>
                <span className="text-xs font-black text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  {propertyLevel}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">Next Level Goal</span>
                <span className="font-bold text-foreground">{levelProgress.nextLevel}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug">
                {levelProgress.documentsRemaining} document(s) remaining for level upgrade ({nextReq}).
              </p>
            </div>

            {/* State-Driven Quick Action Button */}
            <div className="pt-1">
              {status === 'UNVERIFIED' && (
                <Button
                  variant="primary"
                  className="w-full text-xs justify-between"
                  onClick={() => {
                    trackEvent(VERIFICATION_EVENTS.PROPERTY_STARTED);
                    navigate(`/property/verification/wizard?propertyId=${selectedProperty?._id || ''}`);
                  }}
                >
                  <span>Start Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {status === 'DRAFT' && (
                <Button
                  variant="primary"
                  className="w-full text-xs justify-between"
                  onClick={() => navigate(`/property/verification/wizard?propertyId=${selectedProperty?._id || ''}`)}
                >
                  <span>Continue Draft</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {status === 'REJECTED' && (
                <Button
                  variant="secondary"
                  className="w-full text-xs justify-between bg-rose-500 text-white hover:bg-rose-600"
                  onClick={() => navigate(`/property/verification/wizard?propertyId=${selectedProperty?._id || ''}`)}
                >
                  <span>Resubmit Property Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {status === 'APPROVED' && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Property Fully Certified & Verified</span>
                </div>
              )}

              {['SUBMITTED', 'AUTO_REVIEW', 'MANAGER_REVIEW', 'ADMIN_REVIEW'].includes(status) && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>Legal & Physical Inspection Pending</span>
                </div>
              )}
            </div>
          </div>
        </VerificationSectionCard>

        {/* Column 2: Property Trust Hero */}
        <VerificationSectionCard title="Property Trust & Health" subtitle={trustData.statusTitle} icon={Award}>
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

            {/* Property Health Score completeness widget */}
            <div className="w-full p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                <span>Property Health</span>
              </div>
              <span className="font-black text-emerald-500">{healthScore.healthScorePercent}%</span>
            </div>

            <Button
              variant="outline"
              className="text-xs w-full"
              onClick={() => {
                trackEvent(VERIFICATION_EVENTS.PROPERTY_TRUST);
                navigate(`/property/trust-score?propertyId=${selectedProperty?._id || ''}`);
              }}
            >
              <span>View Score Breakdown</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </VerificationSectionCard>

        {/* Column 3: Property Quality Card */}
        <VerificationSectionCard title="Property Quality Metrics" subtitle={selectedProperty?.name || summary.propertyName} icon={Home}>
          <div className="space-y-3 pt-1 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">Property Type</span>
              <span className="font-bold text-foreground">{selectedProperty?.type || summary.propertyType}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                <p className="text-[10px] text-muted-foreground font-semibold">Rent (Monthly)</p>
                <p className="text-sm font-black text-foreground">{selectedProperty?.rentAmount ? `₹${Number(selectedProperty.rentAmount).toLocaleString('en-IN')}` : 'N/A'}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                <p className="text-[10px] text-muted-foreground font-semibold">Total Area</p>
                <p className="text-sm font-black text-foreground">{selectedProperty?.areaSqFt || summary.areaSqFt}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">Physical Inspection</span>
              <span className="font-black text-emerald-500">{summary.inspectionStatus}</span>
            </div>
          </div>
        </VerificationSectionCard>
      </div>

      {/* Verification Readiness Widget */}
      <VerificationSectionCard title="Property Readiness Widget" subtitle="Property listing readiness indicator" icon={Zap}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-4 rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20">
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-foreground">Verified Real Estate Credential</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                {propertyLevel}
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-lg">
              Verified properties receive high listing priority, Gold property badges, and certified trust reports for prospective tenants.
            </p>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-medium pt-1">
              <span>Expiry Target: {renewal.expiresOn}</span>
              <span>•</span>
              <span>Health Completeness: {healthScore.healthScorePercent}%</span>
            </div>
          </div>
          <Button
            variant="primary"
            className="text-xs whitespace-nowrap shrink-0"
            onClick={() => navigate(`/property/verification/wizard?propertyId=${selectedProperty?._id || ''}`)}
          >
            {status === 'UNVERIFIED' ? 'Start Property Verification' : 'Update Verification'}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </VerificationSectionCard>

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
            onClick={() => navigate(`/property/verification/wizard?propertyId=${selectedProperty?._id || ''}`)}
          >
            Fix & Resubmit Property Deeds
          </Button>
        </div>
      )}

      {/* Content Grid Row 1: Document Requirements & Timeline Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UploadRequirementsCard requiredTypes={MOCK_REQUIRED_DOCUMENTS} uploadedTypes={uploadedDocTypes} />

        {/* Timeline Preview */}
        <VerificationSectionCard title="Recent Audit Activity" subtitle="Property lifecycle events" icon={History}>
          {timeline.length === 0 ? (
            <VerificationEmptyState
              icon={Clock}
              title="No Timeline Activity"
              description="Property verification events will appear here once initiated."
            />
          ) : (
            <VerificationTimeline timeline={timeline.slice(0, 5)} />
          )}
        </VerificationSectionCard>
      </div>

      {/* Content Grid Row 2: Renewal Lifecycle & Property Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Renewal Status & History Array */}
        <VerificationSectionCard title="Verification Renewal Lifecycle" subtitle="Annual compliance & validity target" icon={Clock}>
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-xs">
              <span className="font-semibold text-muted-foreground">Current Certificate Expiry</span>
              <span className="font-bold text-foreground">{renewal.expiresOn}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-xs">
              <span className="font-semibold text-muted-foreground">Days Remaining</span>
              <span className="font-bold text-emerald-500">{renewal.daysRemaining} Days</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-xs">
              <span className="font-semibold text-muted-foreground">Last Renewal Completed</span>
              <span className="font-bold text-foreground">{renewal.lastRenewal}</span>
            </div>

            {/* Renewal History Array List */}
            {renewal.renewalHistory && renewal.renewalHistory.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-muted-foreground">Historical Renewals ({renewal.renewalHistory.length})</span>
                <div className="space-y-1.5">
                  {renewal.renewalHistory.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-muted/20 border border-border text-[11px] flex justify-between items-center">
                      <div>
                        <p className="font-bold text-foreground">Renewed on {item.renewedAt}</p>
                        <p className="text-[10px] text-muted-foreground">{item.remarks}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-500 shrink-0 ml-2">{item.newExpiry}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button variant="outline" disabled className="w-full text-xs opacity-75 cursor-not-allowed">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Renew Property Verification (Coming Soon)
            </Button>
          </div>
        </VerificationSectionCard>

        {/* Property Summary */}
        <VerificationSectionCard title="Property Specs Summary" subtitle="Registered property attributes" icon={Building}>
          <div className="space-y-3 pt-1 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">Property Name</span>
              <span className="font-bold text-foreground">{selectedProperty?.name || summary.propertyName}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">Registered Address</span>
              <span className="font-bold text-foreground">{selectedProperty?.address || summary.address}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">Assigned Manager</span>
              <span className="font-bold text-foreground">{user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : summary.managerName}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">Status</span>
              <span className="font-bold text-emerald-500">{selectedProperty?.status?.toUpperCase() || summary.occupancyStatus}</span>
            </div>
          </div>
        </VerificationSectionCard>
      </div>

      {/* Quick Navigation 2x2 Grid */}
      <VerificationSectionCard title="Quick Navigation" subtitle="Access property verification modules" icon={FileText}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <button
            type="button"
            onClick={() => navigate(`/property/verification/documents?propertyId=${selectedProperty?._id || ''}`)}
            className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted text-left transition-all group"
          >
            <FileText className="w-5 h-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-foreground">Documents</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Title deeds & tax receipts</p>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/property/trust-score?propertyId=${selectedProperty?._id || ''}`)}
            className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted text-left transition-all group"
          >
            <Award className="w-5 h-5 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-foreground">Trust & Health</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Score & metrics</p>
          </button>

          <button
            type="button"
            onClick={() => {
              trackEvent(VERIFICATION_EVENTS.PROPERTY_TIMELINE);
              navigate(`/property/verification/timeline?propertyId=${selectedProperty?._id || ''}`);
            }}
            className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted text-left transition-all group"
          >
            <History className="w-5 h-5 text-cyan-500 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-foreground">Audit Log</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Inspection timeline</p>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/property/verification/wizard?propertyId=${selectedProperty?._id || ''}`)}
            className="p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted text-left transition-all group"
          >
            <ShieldCheck className="w-5 h-5 text-violet-500 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-foreground">Wizard</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Multi-step form</p>
          </button>
        </div>
      </VerificationSectionCard>
    </div>
  );
}
