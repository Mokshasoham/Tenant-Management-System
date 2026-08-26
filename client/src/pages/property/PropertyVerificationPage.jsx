import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Building2,
  Home,
  Zap,
  Lock,
  Calendar,
  AlertCircle,
  Activity,
  Plus,
  ChevronDown,
  Search,
  Check,
  MapPin,
  ExternalLink,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVerificationContext } from '../../context/VerificationContext';
import FeatureFlagService from '../../services/FeatureFlagService';
import useAuthStore from '../../context/authStore';
import { trackEvent, VERIFICATION_EVENTS } from '../../utils/verificationAnalytics';
import getVerificationMapper from '../../mappers/verificationMapperFactory';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  VerificationStatusBadge,
  VerificationBadge,
  TrustScoreBadge,
  CircularProgress,
  VerificationSkeleton,
  VerificationErrorState,
} from '../../components/verification';
import { Button } from '../../components/PremiumUI';
import apiClient, { verificationService } from '../../services/api';
import { resolveMediaUrl, DEFAULT_PLACEHOLDER_SVG } from '../../utils/propertyHelper';
import { cn } from '../../utils/cn';

// ── Property Type Styling & Documents Matrix ─────────────────────────────────
const TYPE_COLORS = {
  apartment: '#6366f1',
  flat: '#6366f1',
  studio: '#6366f1',
  house: '#10b981',
  villa: '#10b981',
  commercial: '#f59e0b',
  shop: '#f59e0b',
  land: '#8b5cf6',
  plot: '#8b5cf6',
  hostel: '#a855f7',
  pg: '#f43f5e',
};

/**
 * Returns property-type specific document requirements
 */
function getPropertyTypeRequiredDocs(propType = '') {
  const type = (propType || '').toLowerCase().trim();

  if (type === 'commercial' || type === 'shop') {
    return [
      { type: 'SALE_DEED', name: 'Original Sale Deed / Commercial Lease Deed', category: 'OWNERSHIP', required: true },
      { type: 'PROPERTY_REGISTRATION', name: 'Property Registration Certificate', category: 'LEGAL', required: true },
      { type: 'TAX_RECEIPT', name: 'Latest Commercial Property Tax Receipt', category: 'TAX', required: true },
      { type: 'FIRE_NOC', name: 'Fire Safety NOC Certificate', category: 'SAFETY', required: true },
      { type: 'ELECTRICITY_BILL', name: 'Commercial Electricity / Utility Bill', category: 'UTILITY', required: true },
      { type: 'BUILDING_APPROVAL', name: 'Sanctioned Building Plan Approval', category: 'LEGAL', required: false },
    ];
  }

  if (type === 'house' || type === 'villa') {
    return [
      { type: 'SALE_DEED', name: 'Original Sale Deed / Title Deed', category: 'OWNERSHIP', required: true },
      { type: 'PROPERTY_REGISTRATION', name: 'Property Registration Certificate', category: 'LEGAL', required: true },
      { type: 'TAX_RECEIPT', name: 'Latest Property Tax Receipt', category: 'TAX', required: true },
      { type: 'BUILDING_APPROVAL', name: 'Sanctioned Building Plan Approval', category: 'LEGAL', required: true },
      { type: 'ELECTRICITY_BILL', name: 'Recent Electricity Utility Bill', category: 'UTILITY', required: true },
      { type: 'WATER_BILL', name: 'Recent Water Utility Bill', category: 'UTILITY', required: false },
    ];
  }

  if (type === 'hostel' || type === 'pg') {
    return [
      { type: 'SALE_DEED', name: 'Ownership Deed / Master Lease Deed', category: 'OWNERSHIP', required: true },
      { type: 'PROPERTY_REGISTRATION', name: 'Property Registration Certificate', category: 'LEGAL', required: true },
      { type: 'FIRE_NOC', name: 'Fire Safety NOC Certificate', category: 'SAFETY', required: true },
      { type: 'BUILDING_APPROVAL', name: 'Local Municipal / Trade NOC', category: 'LEGAL', required: true },
      { type: 'TAX_RECEIPT', name: 'Latest Property Tax Receipt', category: 'TAX', required: true },
      { type: 'ELECTRICITY_BILL', name: 'Recent Utility Bill', category: 'UTILITY', required: true },
    ];
  }

  if (type === 'land' || type === 'plot') {
    return [
      { type: 'SALE_DEED', name: 'Original Title Deed / Sale Deed', category: 'OWNERSHIP', required: true },
      { type: 'PROPERTY_REGISTRATION', name: 'Khata Certificate & Extract', category: 'LEGAL', required: true },
      { type: 'TAX_RECEIPT', name: 'Latest Land Revenue / Tax Receipt', category: 'TAX', required: true },
      { type: 'BUILDING_APPROVAL', name: 'Zoning & Conversion Certificate', category: 'LEGAL', required: true },
    ];
  }

  // Default: Apartment / Flat / Studio
  return [
    { type: 'SALE_DEED', name: 'Original Sale Deed / Title Deed', category: 'OWNERSHIP', required: true },
    { type: 'PROPERTY_REGISTRATION', name: 'Property Registration Certificate', category: 'LEGAL', required: true },
    { type: 'TAX_RECEIPT', name: 'Latest Property Tax Receipt', category: 'TAX', required: true },
    { type: 'OCCUPANCY_CERT', name: 'Occupancy Certificate (OC)', category: 'LEGAL', required: true },
    { type: 'BUILDING_APPROVAL', name: 'Sanctioned Building Plan Approval', category: 'LEGAL', required: false },
    { type: 'ELECTRICITY_BILL', name: 'Recent Electricity Utility Bill', category: 'UTILITY', required: true },
    { type: 'LIFT_SAFETY', name: 'Elevator Safety Inspection Certificate', category: 'SAFETY', required: false },
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
//  MANAGER PROPERTY VERIFICATION CENTER COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function PropertyVerificationPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const { loadWidget } = useVerificationContext();

  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedPropertyData, setSelectedPropertyData] = useState(null);
  const [activeVerification, setActiveVerification] = useState(null);

  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingVerification, setLoadingVerification] = useState(false);
  const [propertyError, setPropertyError] = useState(null);

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [propertySearch, setPropertySearch] = useState('');
  const activeRequestIdRef = useRef(0);

  const propertyMapper = getVerificationMapper('PROPERTY');

  // ── 1. Fetch Manager Properties (Manager Portal Isolation) ──
  const fetchManagerProperties = useCallback(async () => {
    setLoadingProperties(true);
    setPropertyError(null);
    try {
      const res = await apiClient.get('/properties');
      const propList = res?.data?.data || res?.data || [];
      const validProps = Array.isArray(propList) ? propList : [];
      setProperties(validProps);

      // Determine initial selected property
      const queryPropId = searchParams.get('propertyId');
      if (queryPropId) {
        const found = validProps.find((p) => String(p._id) === String(queryPropId));
        if (found) {
          setSelectedPropertyId(found._id);
        } else if (validProps.length > 0) {
          // Explicit invalid property ID passed in URL
          setSelectedPropertyId(queryPropId); // Will trigger safe unauthorized/not found state
        }
      } else if (validProps.length > 0) {
        // Pre-select first property and update URL
        setSelectedPropertyId(validProps[0]._id);
        setSearchParams({ propertyId: validProps[0]._id }, { replace: true });
      }
    } catch (err) {
      console.error('[PropertyVerificationPage] Failed to fetch manager properties:', err);
      setPropertyError('Failed to load manager property portfolio.');
    } finally {
      setLoadingProperties(false);
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    fetchManagerProperties();
  }, [fetchManagerProperties]);

  // ── 2. Load Active Property Verification (Strict Isolation per property) ──
  const loadPropertyVerificationData = useCallback(async (propertyId) => {
    if (!propertyId) {
      setActiveVerification(null);
      setSelectedPropertyData(null);
      return;
    }

    const currentRequestId = ++activeRequestIdRef.current;
    setLoadingVerification(true);
    setPropertyError(null);

    // Immediately clear previous property verification to avoid data leakage
    setActiveVerification(null);

    try {
      const res = await verificationService.getActivePropertyVerification(propertyId);

      // Race condition check: Ignore response if user switched property in the meantime
      if (currentRequestId !== activeRequestIdRef.current) return;

      const vrf = res?.data?.data !== undefined ? res.data.data : res?.data || null;
      const prop = res?.data?.property || null;

      setActiveVerification(vrf);
      if (prop) setSelectedPropertyData(prop);

      // Load widget metrics for this property
      await loadWidget('PROPERTY', propertyId);

      trackEvent(VERIFICATION_EVENTS.PROPERTY_STARTED, {
        userId: user?.userId || user?._id || user?.id,
        propertyId,
        role: user?.role,
      });
    } catch (err) {
      if (currentRequestId !== activeRequestIdRef.current) return;

      if (err?.response?.status === 404) {
        setPropertyError('Property not found or does not exist.');
        setActiveVerification(null);
      } else if (err?.response?.status === 403) {
        setPropertyError("Access denied: You do not have permission to view this property's verification.");
        setActiveVerification(null);
      } else {
        console.error('[PropertyVerificationPage] Verification fetch error:', err);
        // If 404 on verification record itself, it means it's unverified / not started — not a fatal error
        setActiveVerification(null);
      }
    } finally {
      if (currentRequestId === activeRequestIdRef.current) {
        setLoadingVerification(false);
      }
    }
  }, [loadWidget, user]);

  useEffect(() => {
    if (selectedPropertyId) {
      loadPropertyVerificationData(selectedPropertyId);
    }
  }, [selectedPropertyId, loadPropertyVerificationData]);

  // ── 3. Switch Selected Property Handler ──
  const handleSelectProperty = (propertyId) => {
    if (propertyId === selectedPropertyId) {
      setSelectorOpen(false);
      return;
    }
    setSelectedPropertyId(propertyId);
    setSearchParams({ propertyId }, { replace: true });
    setSelectorOpen(false);
    setPropertySearch('');
  };

  // Find currently selected property object
  const activeProperty = useMemo(() => {
    return (
      properties.find((p) => String(p._id) === String(selectedPropertyId)) ||
      selectedPropertyData ||
      null
    );
  }, [properties, selectedPropertyId, selectedPropertyData]);

  // Filtered properties for selector search
  const filteredProperties = useMemo(() => {
    if (!propertySearch.trim()) return properties;
    const q = propertySearch.toLowerCase().trim();
    return properties.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.state?.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q) ||
        p.type?.toLowerCase().includes(q)
    );
  }, [properties, propertySearch]);

  // Loading skeleton while loading initial property portfolio
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

  // ── 4. ZERO PROPERTIES EMPTY STATE ──
  if (!loadingProperties && properties.length === 0) {
    return (
      <div className="p-6 sm:p-10 space-y-8">
        <VerificationPageHeader
          title="Property Verification & Trust Portal"
          subtitle="Verify real estate ownership, tax compliance, building safety, and physical inspection metrics"
          icon={Building2}
          breadcrumbs={[{ label: 'Property Operations', href: '/properties' }, { label: 'Property Verification' }]}
        />

        <div className="p-12 text-center rounded-[2.5rem] border border-dashed border-border bg-card/40 backdrop-blur-sm max-w-2xl mx-auto my-12 space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">No properties available for verification</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Add your first managed property to establish its real estate trust score, verify legal title deeds, and increase tenant inquiries.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              onClick={() => navigate('/properties')}
              className="px-6 py-2.5 inline-flex items-center gap-2 font-bold text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Property</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── 5. INVALID / UNAUTHORIZED PROPERTY ID IN URL ──
  if (!activeProperty && selectedPropertyId && !loadingVerification) {
    return (
      <div className="p-6 sm:p-10 space-y-8">
        <VerificationPageHeader
          title="Property Verification & Trust Portal"
          subtitle="Verify real estate ownership, tax compliance, building safety, and physical inspection metrics"
          icon={Building2}
          breadcrumbs={[{ label: 'Property Operations', href: '/properties' }, { label: 'Property Verification' }]}
        />

        <div className="p-10 text-center rounded-[2.5rem] border border-rose-500/20 bg-rose-500/5 max-w-xl mx-auto my-8 space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-foreground">Property Access Denied or Not Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {propertyError || "The requested property does not exist or you do not have permission to manage its verification."}
          </p>
          {properties.length > 0 && (
            <button
              type="button"
              onClick={() => handleSelectProperty(properties[0]._id)}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-all cursor-pointer shadow-md"
            >
              Switch to {properties[0].name}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── 6. MAP VERIFICATION DATA FOR ACTIVE PROPERTY ──
  const isUnverified = !activeVerification || activeVerification.status === 'UNVERIFIED';
  const verification = activeVerification ? propertyMapper.mapVerification(activeVerification) : {};
  const trustData = activeVerification
    ? propertyMapper.mapTrustScore(activeVerification?.trustScoreData)
    : { score: 0, badge: 'UNVERIFIED', statusTitle: 'Unverified Property', percentileText: '0 / 100' };
  const timeline = activeVerification ? propertyMapper.mapTimeline(activeVerification?.timeline) : [];
  const documents = activeVerification ? propertyMapper.mapDocuments(activeVerification?.documents) : [];
  const renewal = activeVerification
    ? propertyMapper.mapRenewalStatus(activeVerification?.renewalStatus)
    : { expiresOn: 'N/A', daysRemaining: 0, renewalStatus: 'NOT_APPLICABLE' };
  const levelProgress = activeVerification
    ? propertyMapper.mapPropertyLevels(activeVerification?.propertyLevels)
    : { currentLevel: 'Unverified Property', nextLevel: 'Level 1: Basic Identity', documentsRemaining: 2 };
  const healthScore = activeVerification
    ? propertyMapper.mapPropertyHealth(activeVerification?.propertyHealth)
    : { healthScorePercent: 0 };

  const status = verification.status || 'UNVERIFIED';
  const vrfNumber = verification.verificationNumber || 'N/A';
  const trustScore = isUnverified ? 0 : trustData.score || 0;
  const badge = isUnverified ? 'UNVERIFIED' : trustData.badge || 'UNVERIFIED';
  const propertyLevel = isUnverified ? 'Unverified Property' : verification.propertyLevel || 'Unverified Property';

  const propType = (activeProperty?.type || 'apartment').toLowerCase();
  const typeColor = TYPE_COLORS[propType] || '#6366f1';
  const requiredDocList = getPropertyTypeRequiredDocs(propType);

  // Extract cover image
  const coverUrl = resolveMediaUrl(
    activeProperty?.images?.[0] || activeProperty?.media?.find((m) => m.mediaType === 'image')?.url
  );

  return (
    <div className="p-6 sm:p-10 space-y-6">
      {/* ══ HEADER ══ */}
      <VerificationPageHeader
        title="Property Verification & Trust Portal"
        subtitle="Verify real estate ownership, tax compliance, building safety, and physical inspection metrics"
        icon={Building2}
        breadcrumbs={[{ label: 'Property Operations', href: '/properties' }, { label: 'Property Verification' }]}
        actionSlot={
          <Button
            variant="outline"
            type="button"
            onClick={() => loadPropertyVerificationData(selectedPropertyId)}
            className="text-xs font-bold"
            disabled={loadingVerification}
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loadingVerification && "animate-spin")} />
            {loadingVerification ? 'Refreshing…' : 'Refresh Data'}
          </Button>
        }
      />

      {/* ══ 1. PROPERTY SELECTOR HERO SECTION ══ */}
      <div className="p-5 rounded-[2rem] bg-card border border-border shadow-sm transition-all relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          {/* Left: Active Property Preview */}
          <div className="flex items-center gap-4 min-w-0">
            {/* Property Thumbnail */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-muted border border-border flex-shrink-0 relative shadow-inner">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={activeProperty?.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEFAULT_PLACEHOLDER_SVG;
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building className="w-7 h-7 text-muted-foreground/30" />
                </div>
              )}
              <span
                className="absolute top-1 left-1 text-[8px] font-black text-white px-1.5 py-0.5 rounded uppercase tracking-tighter"
                style={{ backgroundColor: typeColor }}
              >
                {activeProperty?.type || 'property'}
              </span>
            </div>

            {/* Property Info */}
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-foreground truncate">
                  {activeProperty?.name}
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider">
                  {activeProperty?.status || 'Available'}
                </span>
              </div>

              <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                <span>
                  {[activeProperty?.address, activeProperty?.city, activeProperty?.state]
                    .filter(Boolean)
                    .join(', ') || 'Managed Property'}
                </span>
              </p>

              <div className="flex items-center gap-3 text-xs font-bold text-foreground pt-0.5">
                <span>₹{(activeProperty?.rentAmount || 0).toLocaleString('en-IN')}<span className="text-[10px] text-muted-foreground font-normal">/mo</span></span>
                {activeProperty?.bedrooms != null && (
                  <span className="text-muted-foreground text-[11px] font-semibold">🛏 {activeProperty.bedrooms} Beds</span>
                )}
                {activeProperty?.bathrooms != null && (
                  <span className="text-muted-foreground text-[11px] font-semibold">🚿 {activeProperty.bathrooms} Baths</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Property Switcher Trigger */}
          <div className="relative w-full lg:w-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => setSelectorOpen((v) => !v)}
              className="w-full lg:w-auto px-5 py-3 rounded-2xl bg-muted/80 hover:bg-muted border border-border text-foreground font-bold text-xs flex items-center justify-between lg:justify-start gap-3 transition-all cursor-pointer shadow-sm hover:border-primary/40"
            >
              <div className="flex items-center gap-2 text-left">
                <Building2 className="w-4 h-4 text-primary" />
                <span>Switch Property ({properties.length} available)</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", selectorOpen && "rotate-180")} />
            </button>

            {/* Dropdown Popover */}
            <AnimatePresence>
              {selectorOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="absolute right-0 top-full mt-2 w-full sm:w-[380px] rounded-2xl bg-card border border-border shadow-2xl p-3 z-50 space-y-2"
                >
                  {/* Search Filter */}
                  {properties.length > 3 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-muted-foreground/50 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={propertySearch}
                        onChange={(e) => setPropertySearch(e.target.value)}
                        placeholder="Search property name or city…"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted border border-border text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}

                  {/* Properties List */}
                  <div className="max-h-[280px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-border">
                    {filteredProperties.length === 0 ? (
                      <p className="p-4 text-center text-xs text-muted-foreground">No matching properties found.</p>
                    ) : (
                      filteredProperties.map((p) => {
                        const isSelected = String(p._id) === String(selectedPropertyId);
                        const pType = (p.type || 'apartment').toLowerCase();
                        const pColor = TYPE_COLORS[pType] || '#6366f1';
                        return (
                          <button
                            key={p._id}
                            type="button"
                            onClick={() => handleSelectProperty(p._id)}
                            className={cn(
                              "w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer group",
                              isSelected
                                ? "bg-primary/10 border-primary text-foreground shadow-sm"
                                : "bg-card hover:bg-muted/60 border-border/60 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <div className="min-w-0 pr-2 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-foreground truncate">{p.name}</span>
                                <span
                                  className="text-[7px] font-black text-white px-1 rounded uppercase tracking-tighter"
                                  style={{ backgroundColor: pColor }}
                                >
                                  {p.type || 'apt'}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground/70 truncate">
                                📍 {[p.city, p.state].filter(Boolean).join(', ') || 'India'} • ₹{(p.rentAmount || 0).toLocaleString('en-IN')}/mo
                              </p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Quick Horizontal Property Switcher Pills (for 2-6 properties) */}
        {properties.length > 1 && (
          <div className="flex items-center gap-2 pt-4 mt-4 border-t border-border/40 overflow-x-auto scrollbar-none">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 flex-shrink-0">
              Quick Select:
            </span>
            {properties.map((p) => {
              const isSelected = String(p._id) === String(selectedPropertyId);
              return (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => handleSelectProperty(p._id)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted text-muted-foreground border-border hover:text-foreground hover:bg-muted/80"
                  )}
                >
                  <span>{p.name}</span>
                  {isSelected && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ ERROR STATE BANNER (if any) ══ */}
      {propertyError && (
        <VerificationErrorState
          error={propertyError}
          onRetry={() => loadPropertyVerificationData(selectedPropertyId)}
        />
      )}

      {/* ══ STATE-DRIVEN STATUS NOTIFICATION BANNER ══ */}
      <div
        className={cn(
          "p-4 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all",
          status === 'APPROVED'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
            : status === 'REJECTED'
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-600'
            : status === 'DRAFT'
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
            : ['SUBMITTED', 'AUTO_REVIEW', 'MANAGER_REVIEW', 'ADMIN_REVIEW'].includes(status)
            ? 'bg-blue-500/10 border-blue-500/20 text-blue-600'
            : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'
        )}
      >
        <div className="flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            {status === 'UNVERIFIED' &&
              `Verification not started for "${activeProperty?.name}". Start verification to establish real estate trust and compliance.`}
            {status === 'DRAFT' &&
              `Verification draft in progress for "${activeProperty?.name}". Upload remaining required documents.`}
            {['SUBMITTED', 'AUTO_REVIEW', 'MANAGER_REVIEW', 'ADMIN_REVIEW'].includes(status) &&
              `Verification application for "${activeProperty?.name}" is under legal and physical review.`}
            {status === 'REJECTED' &&
              `Verification rejected for "${activeProperty?.name}" — please upload corrected ownership deed or tax receipt.`}
            {status === 'APPROVED' &&
              `"${activeProperty?.name}" is fully certified, verified, and legally compliant.`}
            {status === 'EXPIRED' &&
              `Verification target expired for "${activeProperty?.name}". Initiate annual compliance renewal.`}
          </span>
        </div>

        {status === 'UNVERIFIED' && (
          <Button
            variant="primary"
            className="text-xs shrink-0 ml-4 py-1.5 px-3 font-bold"
            onClick={() => {
              trackEvent(VERIFICATION_EVENTS.PROPERTY_STARTED);
              navigate(`/property/verification/wizard?propertyId=${selectedPropertyId}`);
            }}
          >
            Verify Property
          </Button>
        )}
      </div>

      {/* ══ HERO OVERVIEW GRID (3 Columns) ══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Verification Status */}
        <VerificationSectionCard
          title="Verification Status"
          subtitle={`VRF Sequence: ${vrfNumber}`}
          icon={ShieldCheck}
        >
          <div className="space-y-3.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Verification State</span>
              <VerificationStatusBadge status={status} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Property Badge</span>
              <VerificationBadge badge={badge} />
            </div>

            {/* Current Level & Progress */}
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
                {isUnverified
                  ? 'Start verification to establish initial Level 1 ownership.'
                  : `${levelProgress.documentsRemaining || 1} document(s) remaining for level upgrade.`}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-1">
              {status === 'UNVERIFIED' && (
                <Button
                  variant="primary"
                  className="w-full text-xs justify-between font-bold"
                  onClick={() => navigate(`/property/verification/wizard?propertyId=${selectedPropertyId}`)}
                >
                  <span>Start Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {status === 'DRAFT' && (
                <Button
                  variant="primary"
                  className="w-full text-xs justify-between font-bold"
                  onClick={() => navigate(`/property/verification/wizard?propertyId=${selectedPropertyId}`)}
                >
                  <span>Continue Draft</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {status === 'REJECTED' && (
                <Button
                  variant="secondary"
                  className="w-full text-xs justify-between bg-rose-500 text-white hover:bg-rose-600 font-bold"
                  onClick={() => navigate(`/property/verification/wizard?propertyId=${selectedPropertyId}`)}
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
                  <span>Inspection & Legal Review Pending</span>
                </div>
              )}
            </div>
          </div>
        </VerificationSectionCard>

        {/* Column 2: Property Trust & Health */}
        <VerificationSectionCard
          title="Property Trust & Health"
          subtitle={trustData.statusTitle || 'Unverified Property'}
          icon={Award}
        >
          <div className="flex flex-col items-center justify-center space-y-3 pt-1 text-center">
            <CircularProgress value={trustScore} max={100} size={110} strokeWidth={9} color="#10b981">
              <div className="text-center">
                <span className="text-2xl font-black text-foreground">{trustScore}</span>
                <span className="text-[10px] text-muted-foreground block font-semibold">/100</span>
              </div>
            </CircularProgress>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-500 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                {isUnverified ? 'Unverified' : trustData.percentileText}
              </span>
              <TrustScoreBadge badge={badge} />
            </div>

            {/* Health Score */}
            <div className="w-full p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                <span>Property Health</span>
              </div>
              <span className="font-black text-emerald-500">{healthScore.healthScorePercent}%</span>
            </div>

            <Button
              variant="outline"
              className="text-xs w-full font-bold"
              onClick={() => {
                trackEvent(VERIFICATION_EVENTS.PROPERTY_TRUST);
                navigate(`/property/trust-score?propertyId=${selectedPropertyId}`);
              }}
            >
              <span>View Score Breakdown</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </VerificationSectionCard>

        {/* Column 3: Property Quality Metrics */}
        <VerificationSectionCard
          title="Property Quality Metrics"
          subtitle={activeProperty?.name || 'Selected Property'}
          icon={Home}
        >
          <div className="space-y-3 pt-1 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">Property Type</span>
              <span className="font-bold text-foreground capitalize">{activeProperty?.type || 'Property'}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                <p className="text-[10px] text-muted-foreground font-semibold">Rent (Monthly)</p>
                <p className="text-sm font-black text-foreground">
                  ₹{(activeProperty?.rentAmount || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                <p className="text-[10px] text-muted-foreground font-semibold">Total Area</p>
                <p className="text-sm font-black text-foreground">
                  {activeProperty?.areaSqFt || activeProperty?.sqft ? `${activeProperty.areaSqFt || activeProperty.sqft} sqft` : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">Physical Inspection</span>
              <span className="font-black text-emerald-500">
                {activeVerification?.inspectionStatus || (isUnverified ? 'Pending Initiation' : 'Scheduled')}
              </span>
            </div>
          </div>
        </VerificationSectionCard>
      </div>

      {/* ══ PROPERTY READINESS WIDGET ══ */}
      <VerificationSectionCard
        title="Property Readiness Widget"
        subtitle="Property listing readiness indicator"
        icon={Zap}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-4 rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20">
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-foreground">Verified Real Estate Credential</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                {propertyLevel}
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
              Verified properties receive high listing priority on Browse Map View, Gold property badges, and certified compliance reports for prospective tenants.
            </p>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-medium pt-1">
              <span>Expiry Target: {renewal.expiresOn}</span>
              <span>•</span>
              <span>Health Completeness: {healthScore.healthScorePercent}%</span>
            </div>
          </div>

          <Button
            variant="primary"
            className="text-xs whitespace-nowrap shrink-0 font-bold"
            onClick={() => navigate(`/property/verification/wizard?propertyId=${selectedPropertyId}`)}
          >
            {status === 'UNVERIFIED' ? 'Start Property Verification' : 'Update Verification'}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </VerificationSectionCard>

      {/* ══ REQUIRED DOCUMENTS & AUDIT ACTIVITY (2 Columns) ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Required Documents Checklist */}
        <VerificationSectionCard
          title="Required Documents Checklist"
          subtitle={`Tailored compliance checklist for ${activeProperty?.type || 'property'}`}
          icon={FileText}
          actionSlot={
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => navigate(`/property/verification/documents?propertyId=${selectedPropertyId}`)}
            >
              Manage Documents →
            </Button>
          }
        >
          <div className="space-y-2.5 pt-1">
            {requiredDocList.map((doc) => {
              const uploadedDoc = documents.find((d) => d.documentType === doc.type);
              const docStatus = uploadedDoc?.status || (isUnverified ? 'PENDING' : 'PENDING');

              return (
                <div
                  key={doc.type}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        docStatus === 'VERIFIED'
                          ? "bg-emerald-500"
                          : docStatus === 'REJECTED'
                          ? "bg-rose-500"
                          : "bg-amber-500/60"
                      )}
                    />
                    <span className="font-semibold text-foreground truncate">{doc.name}</span>
                    {doc.required && (
                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter">
                        Required
                      </span>
                    )}
                  </div>

                  <span
                    className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0",
                      docStatus === 'VERIFIED'
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : docStatus === 'REJECTED'
                        ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        : "bg-muted text-muted-foreground border border-border"
                    )}
                  >
                    {docStatus}
                  </span>
                </div>
              );
            })}
          </div>
        </VerificationSectionCard>

        {/* Right: Recent Audit Activity */}
        <VerificationSectionCard
          title="Recent Audit Activity"
          subtitle={`Audit log for ${activeProperty?.name}`}
          icon={History}
          actionSlot={
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => navigate(`/property/verification/timeline?propertyId=${selectedPropertyId}`)}
            >
              View Full Log →
            </Button>
          }
        >
          <div className="pt-1">
            {timeline.length === 0 ? (
              <div className="p-8 text-center bg-muted/20 border border-dashed border-border rounded-2xl space-y-2">
                <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="font-bold text-foreground text-xs">No Timeline Activity</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Property verification events and inspection logs will appear here once initiated.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {timeline.slice(-4).map((evt, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/30 border border-border text-xs"
                  >
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary flex-shrink-0 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-bold text-foreground">{evt.event || 'Audit Event'}</p>
                      <p className="text-[11px] text-muted-foreground">{evt.note || 'Compliance review update'}</p>
                      <p className="text-[9px] text-muted-foreground/60">
                        {evt.performedAt ? new Date(evt.performedAt).toLocaleString() : 'Recent'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </VerificationSectionCard>
      </div>

      {/* ══ VERIFICATION RENEWAL & SPECS (2 Columns) ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Verification Renewal */}
        <VerificationSectionCard
          title="Verification Renewal Lifecycle"
          subtitle="Annual compliance & validity target"
          icon={Calendar}
        >
          <div className="space-y-3 pt-1 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">Current Certificate Expiry</span>
              <span className="font-bold text-foreground">{renewal.expiresOn || 'N/A'}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">Days Remaining</span>
              <span className="font-black text-primary">{renewal.daysRemaining || 0} Days</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">Last Renewal Completed</span>
              <span className="font-bold text-foreground">{renewal.lastRenewedOn || 'N/A'}</span>
            </div>
          </div>
        </VerificationSectionCard>

        {/* Right: Property Specs Summary */}
        <VerificationSectionCard
          title="Property Specs Summary"
          subtitle="Registered property attributes"
          icon={Building2}
        >
          <div className="space-y-2.5 pt-1 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">Property Name</span>
              <span className="font-bold text-foreground truncate max-w-[200px]">{activeProperty?.name}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">Registered Address</span>
              <span className="font-bold text-foreground truncate max-w-[200px]">
                {[activeProperty?.address, activeProperty?.city, activeProperty?.state].filter(Boolean).join(', ') || 'Managed Property'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">Assigned Manager</span>
              <span className="font-bold text-foreground">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Active Manager'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
              <span className="text-muted-foreground font-medium">Status</span>
              <span className="font-black text-emerald-500 uppercase">{activeProperty?.status || 'Available'}</span>
            </div>
          </div>
        </VerificationSectionCard>
      </div>

      {/* ══ QUICK NAVIGATION ══ */}
      <VerificationSectionCard
        title="Quick Navigation"
        subtitle="Access property verification sub-modules"
        icon={ExternalLink}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {[
            {
              label: 'Documents',
              desc: 'Title deeds & tax receipts',
              icon: FileText,
              path: `/property/verification/documents?propertyId=${selectedPropertyId}`,
            },
            {
              label: 'Trust & Health',
              desc: 'Score & quality metrics',
              icon: Award,
              path: `/property/trust-score?propertyId=${selectedPropertyId}`,
            },
            {
              label: 'Audit Log',
              desc: 'Inspection timeline',
              icon: History,
              path: `/property/verification/timeline?propertyId=${selectedPropertyId}`,
            },
            {
              label: 'Wizard',
              desc: 'Multi-step verification form',
              icon: ShieldCheck,
              path: `/property/verification/wizard?propertyId=${selectedPropertyId}`,
            },
          ].map(({ label, desc, icon: Icon, path }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate(path)}
              className="p-3.5 rounded-2xl bg-muted/40 hover:bg-muted border border-border hover:border-primary/40 text-left transition-all cursor-pointer group space-y-1"
            >
              <div className="flex items-center justify-between">
                <Icon className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </div>
              <p className="font-black text-xs text-foreground group-hover:text-primary transition-colors">{label}</p>
              <p className="text-[10px] text-muted-foreground/70 truncate">{desc}</p>
            </button>
          ))}
        </div>
      </VerificationSectionCard>
    </div>
  );
}
