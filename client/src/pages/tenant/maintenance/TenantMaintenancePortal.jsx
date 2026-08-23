import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  RefreshCw,
  AlertCircle,
  Lock,
  CheckCircle2,
  Check,
  Sparkles,
  Building2,
  ShieldCheck,
  Clock,
  ArrowRight,
  Plus,
  QrCode,
  Home
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { maintenanceService, leaseService, platformService } from '../../../services/api';
import { cn } from '../../../utils/cn';

import TenantMaintenanceHeader from './TenantMaintenanceHeader';
import TenantMaintenanceSummary from './TenantMaintenanceSummary';
import TenantMaintenanceCalendar from './TenantMaintenanceCalendar';
import TenantUpcomingMaintenance from './TenantUpcomingMaintenance';
import TenantMaintenanceRequests from './TenantMaintenanceRequests';
import TenantMaintenanceHistory from './TenantMaintenanceHistory';
import TenantMaintenanceRequestForm from './TenantMaintenanceRequestForm';
import TenantMaintenanceDetails from './TenantMaintenanceDetails';
import TenantLeaseSelectModal from './TenantLeaseSelectModal';
import TenantMaintenanceVerifyModal from './TenantMaintenanceVerifyModal';
import TenantMaintenanceUnlockModal from './TenantMaintenanceUnlockModal';
import TenantMaintenanceHowItWorksModal from './TenantMaintenanceHowItWorksModal';
import TenantPropertyQrModal from './TenantPropertyQrModal';

export default function TenantMaintenancePortal() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const targetLeaseId = location.state?.leaseId || searchParams.get('leaseId');
  const targetPropertyId = location.state?.propertyId || searchParams.get('propertyId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requests, setRequests] = useState([]);
  const [leases, setLeases] = useState([]);
  const [activePropertyLease, setActivePropertyLease] = useState(null);

  const [showLeaseSelectModal, setShowLeaseSelectModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [showPropertyQrModal, setShowPropertyQrModal] = useState(false);
  const [selectedLease, setSelectedLease] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [accessConfig, setAccessConfig] = useState({ fee: 500, frequency: 'monthly', version: '1.0' });

  const fetchTenantData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch authenticated tenant requests, leases, and public config concurrently
      const [maintRes, leaseRes, configRes] = await Promise.all([
        maintenanceService.getAllRequests({ limit: 100 }),
        leaseService.getMyLease().catch(() => null),
        platformService.getPublicConfig().catch(() => null),
      ]);

      const list = maintRes?.data?.data || maintRes?.data || (Array.isArray(maintRes) ? maintRes : []);
      setRequests(list);

      const allActive = leaseRes?.activeLeases || (leaseRes?.data ? [leaseRes.data] : []);
      const eligible = Array.isArray(allActive) ? allActive.filter(l => ['active', 'pending'].includes(l.status)) : [];
      setLeases(eligible);

      // Prioritize targetLeaseId or targetPropertyId from navigation, then previous selection, then eligible[0]
      setActivePropertyLease(prev => {
        if (targetLeaseId) {
          const match = eligible.find(l => String(l._id || l.id) === String(targetLeaseId));
          if (match) return match;
        }
        if (targetPropertyId) {
          const match = eligible.find(l => String(l.property?._id || l.property?.id || l.property || '') === String(targetPropertyId));
          if (match) return match;
        }
        if (prev) {
          const match = eligible.find(l => (l._id || l.id) === (prev._id || prev.id));
          if (match) return match;
        }
        return eligible[0] || null;
      });

      const conf = configRes?.data?.data || configRes?.data || configRes;
      if (conf) {
        setAccessConfig({
          fee: conf.maintenanceFee !== undefined ? conf.maintenanceFee : 500,
          frequency: conf.maintenanceFeeFrequency || 'monthly',
          version: conf.maintenanceTermsVersion || '1.0',
        });
      }
    } catch (err) {
      console.error('Error fetching tenant maintenance data:', err);
      setError('Unable to load your maintenance records. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [targetLeaseId, targetPropertyId]);

  useEffect(() => {
    fetchTenantData();
  }, [fetchTenantData]);

  // Synchronize when route params or state change
  useEffect(() => {
    if (leases.length === 0) return;
    if (targetLeaseId) {
      const match = leases.find(l => String(l._id || l.id) === String(targetLeaseId));
      if (match) {
        setActivePropertyLease(match);
        return;
      }
    }
    if (targetPropertyId) {
      const match = leases.find(l => String(l.property?._id || l.property?.id || l.property || '') === String(targetPropertyId));
      if (match) {
        setActivePropertyLease(match);
      }
    }
  }, [targetLeaseId, targetPropertyId, leases]);

  const currentLease = activePropertyLease || leases[0] || null;
  // If lease exists and maintenance is not enabled, mark as locked
  const isLocked = Boolean(currentLease && currentLease.maintenanceEnabled === false);

  // Filter requests isolated strictly to the selected lease / property
  const filteredRequests = currentLease
    ? requests.filter(r => {
        const rLeaseId = String(r.lease?._id || r.lease || '');
        const rPropId = String(r.property?._id || r.property || '');
        const curLeaseId = String(currentLease._id || currentLease.id || '');
        const curPropId = String(currentLease.property?._id || currentLease.property || '');
        return rLeaseId === curLeaseId || (curPropId && rPropId === curPropId);
      })
    : requests;

  const handleOpenSubmit = () => {
    if (isLocked) {
      setShowUnlockModal(true);
      return;
    }
    const targetLease = currentLease || leases[0] || null;
    setSelectedLease(targetLease);
    setShowSubmitModal(true);
  };

  const handleSelectLease = (lease) => {
    if (lease.maintenanceEnabled === false) {
      setActivePropertyLease(lease);
      setShowLeaseSelectModal(false);
      return;
    }
    setSelectedLease(lease);
    setShowLeaseSelectModal(false);
    setShowSubmitModal(true);
  };

  const handleChangeLeaseFromForm = () => {
    setShowSubmitModal(false);
    setShowLeaseSelectModal(true);
  };

  const propertyName = currentLease?.property?.name || currentLease?.propertyName || 'Your Property';

  return (
    <div className={cn(
      "min-h-screen p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans transition-colors duration-300 relative",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#020817] text-slate-100"
    )}>
      {/* Background Ambient Radial Accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <TenantMaintenanceHeader
        onHowItWorksClick={() => setShowHowItWorksModal(true)}
        theme={theme}
      />

      {/* Property Selector Pills */}
      {leases.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 border-b border-slate-800/80">
          <div className="flex items-center gap-2 text-slate-400 font-black uppercase tracking-[0.2em] text-[11px] shrink-0">
            <Building2 className="w-4 h-4 text-amber-500" />
            <span>PROPERTY:</span>
          </div>

          <div className="flex items-center gap-2.5">
            {leases.map((l) => {
              const isSelected = (currentLease?._id || currentLease?.id) === (l._id || l.id);
              const isLeaseLocked = l.maintenanceEnabled === false;
              const name = l.property?.name || l.propertyName || 'Property';

              return (
                <button
                  key={l._id || l.id}
                  onClick={() => setActivePropertyLease(l)}
                  className={cn(
                    "px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center gap-2.5 cursor-pointer shrink-0",
                    isSelected && isLeaseLocked
                      ? "border-2 border-amber-500/90 bg-[#0C152B] text-white shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                      : isSelected && !isLeaseLocked
                      ? "border-2 border-emerald-500/90 bg-[#081F1F] text-white shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                      : "bg-[#060D1D]/90 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  )}
                >
                  <span className="font-semibold">{name}</span>
                  {isLeaseLocked ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      Locked
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      Included
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* API Error Retry Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-400 text-xs font-bold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchTenantData}
            className="px-3 py-1 rounded-xl bg-rose-600 text-white hover:bg-rose-500 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* ══ LOADING SPINNER ══ */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Loading maintenance records...</p>
          </div>
        </div>
      )}

      {/* ══ EMPTY STATE: NO ACTIVE LEASE / NO PROPERTY ══ */}
      {!loading && leases.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2.5rem] bg-white dark:bg-[#0B1424] border border-slate-200 dark:border-emerald-500/20 shadow-xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6"
        >
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 border border-emerald-500/30">
            <Home className="w-10 h-10" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>No Active Property</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Maintenance starts after you move in.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-lg mx-auto leading-relaxed">
              Once you have an active lease, you can report maintenance issues, track repairs, and communicate with your property manager from here.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/browse')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>EXPLORE PROPERTIES</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/saved')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>VIEW SAVED PROPERTIES</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* ══ CONDITIONAL: LOCKED CARD VS INCLUDED CARD + DASHBOARD (WHEN LEASE EXISTS) ══ */}
      {!loading && leases.length > 0 && (isLocked ? (
        /* 🔒 LOCKED MAINTENANCE CARD (ORANGE THEME) */
        <div className="relative rounded-[28px] bg-gradient-to-b from-[#0B142B]/95 via-[#070D1F]/98 to-[#030712] border border-amber-500/35 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9),0_0_30px_-5px_rgba(245,158,11,0.12)] p-6 sm:p-8 overflow-hidden animate-fade-in">
          {/* Ambient decorative backlights */}
          <div className="absolute -left-12 -top-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left Column: Lock Badge & Skyline Graphic */}
            <div className="lg:col-span-4 flex flex-col justify-between h-full space-y-4">
              <div className="flex items-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-black tracking-wider uppercase">
                  <Lock className="w-3.5 h-3.5" />
                  <span>LOCKED</span>
                </span>
              </div>

              {/* Skyline & Glowing Shield Graphic */}
              <div className="relative w-full max-w-[220px] aspect-[4/3] flex items-center justify-center mx-auto my-2">
                <div className="absolute inset-0 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
                <svg viewBox="0 0 200 120" className="w-full h-full text-slate-800/80 absolute inset-0 z-0">
                  <path fill="currentColor" opacity="0.6" d="M10 120 L10 65 L25 65 L25 50 L40 50 L40 120 Z" />
                  <path fill="currentColor" opacity="0.8" d="M35 120 L35 40 L55 40 L55 25 L65 25 L65 120 Z" />
                  <path fill="currentColor" opacity="0.5" d="M70 120 L70 30 L80 15 L90 30 L90 120 Z" />
                  <path fill="currentColor" opacity="0.7" d="M110 120 L110 35 L130 35 L130 120 Z" />
                  <path fill="currentColor" opacity="0.6" d="M135 120 L135 55 L150 55 L150 40 L165 40 L165 120 Z" />
                  <path fill="currentColor" opacity="0.5" d="M160 120 L160 70 L185 70 L185 120 Z" />
                  <circle cx="45" cy="55" r="1.5" fill="#f59e0b" opacity="0.6" />
                  <circle cx="45" cy="70" r="1.5" fill="#f59e0b" opacity="0.6" />
                  <circle cx="120" cy="50" r="1.5" fill="#f59e0b" opacity="0.7" />
                  <circle cx="120" cy="65" r="1.5" fill="#f59e0b" opacity="0.7" />
                  <circle cx="120" cy="80" r="1.5" fill="#f59e0b" opacity="0.7" />
                  <circle cx="145" cy="60" r="1.5" fill="#f59e0b" opacity="0.5" />
                  <circle cx="145" cy="75" r="1.5" fill="#f59e0b" opacity="0.5" />
                </svg>
                <div className="relative z-10 w-24 h-28 flex items-center justify-center">
                  <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                    <defs>
                      <linearGradient id="lockedShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#ea580c" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <path d="M50 5 L90 22 C90 70 50 110 50 110 C50 110 10 70 10 22 Z" fill="url(#lockedShieldGrad)" stroke="#f59e0b" strokeWidth="3" />
                    <path d="M50 16 L80 30 C80 68 50 98 50 98 C50 98 20 68 20 30 Z" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-amber-400">
                    <Lock className="w-8 h-8 stroke-[2.5] drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Column: Title, Subtitle, Benefits */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Maintenance &amp; Repairs
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 leading-relaxed">
                  Maintenance coverage is not enabled for{' '}
                  <span className="text-amber-400 font-bold">{propertyName}</span>.
                </p>
              </div>

              <div className="pt-2">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/90 mb-3">
                  YOU'LL GET ACCESS TO
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-200">
                  {[
                    'Maintenance requests',
                    'Technician support',
                    'Repair tracking',
                    'Scheduled visits',
                    'Maintenance history',
                    'QR-based verification'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span className="font-semibold text-slate-200">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Price & Unlock CTA */}
            <div className="lg:col-span-3 lg:border-l lg:border-slate-800/80 lg:pl-8 flex flex-col justify-between h-full space-y-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-800">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>MAINTENANCE ACCESS</span>
                </div>

                <div className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight mt-1.5 drop-shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                  ₹{currentLease?.maintenanceFee || accessConfig.fee}{' '}
                  <span className="text-xs text-slate-400 font-medium tracking-normal">
                    / {accessConfig.frequency}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">
                  Unlock comprehensive maintenance coverage for this property.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setShowUnlockModal(true)}
                  className="w-full px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm tracking-wide bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:via-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Lock className="w-4 h-4 stroke-[2.5]" />
                  <span>Unlock Maintenance Feature</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPropertyQrModal(true)}
                  className="w-full px-4 py-2.5 rounded-xl font-bold text-xs bg-[#0F172E] hover:bg-[#152244] border border-amber-500/30 text-amber-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/10"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>View QR Code</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-center">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span className="text-[9px] font-bold text-slate-400 leading-tight">Reliable<br/>Support</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-[9px] font-bold text-slate-400 leading-tight">Faster<br/>Resolution</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-[9px] font-bold text-slate-400 leading-tight">Track<br/>Everything</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ✅ INCLUDED MAINTENANCE CARD (GREEN THEME) + ACTIVE DASHBOARD */
        <div className="space-y-6 animate-fade-in">
          {/* Included Hero Card */}
          <div className="relative rounded-[28px] bg-gradient-to-b from-[#061C1E]/95 via-[#031317]/98 to-[#020B0E] border border-emerald-500/35 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9),0_0_30px_-5px_rgba(16,185,129,0.12)] p-6 sm:p-8 overflow-hidden">
            {/* Ambient decorative backlights */}
            <div className="absolute -left-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              {/* Left Column: Included Badge & House Graphic */}
              <div className="lg:col-span-4 flex flex-col justify-between h-full space-y-4">
                <div className="flex items-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black tracking-wider uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>INCLUDED</span>
                  </span>
                </div>

                {/* House & Glowing Shield Graphic */}
                <div className="relative w-full max-w-[220px] aspect-[4/3] flex items-center justify-center mx-auto my-2">
                  <div className="absolute inset-0 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
                  <svg viewBox="0 0 200 120" className="w-full h-full text-slate-800/80 absolute inset-0 z-0">
                    <path fill="currentColor" opacity="0.7" d="M30 65 L100 15 L170 65 L160 65 L160 115 L40 115 L40 65 Z" />
                    <path fill="#02201c" opacity="0.9" d="M45 68 L100 25 L155 68 L150 68 L150 112 L50 112 L50 68 Z" />
                    <rect x="135" y="25" width="14" height="25" fill="currentColor" opacity="0.6" />
                    <rect x="60" y="75" width="18" height="22" rx="2" fill="#10b981" opacity="0.7" />
                    <rect x="122" y="75" width="18" height="22" rx="2" fill="#10b981" opacity="0.7" />
                    <circle cx="25" cy="85" r="14" fill="currentColor" opacity="0.5" />
                    <circle cx="178" cy="80" r="16" fill="currentColor" opacity="0.5" />
                  </svg>
                  <div className="relative z-10 w-24 h-28 flex items-center justify-center">
                    <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                      <defs>
                        <linearGradient id="includedShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
                        </linearGradient>
                      </defs>
                      <path d="M50 5 L90 22 C90 70 50 110 50 110 C50 110 10 70 10 22 Z" fill="url(#includedShieldGrad)" stroke="#10b981" strokeWidth="3" />
                      <path d="M50 16 L80 30 C80 68 50 98 50 98 C50 98 20 68 20 30 Z" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-emerald-400">
                      <Check className="w-9 h-9 stroke-[3] drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Column: Title, Subtitle, Benefits */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Maintenance &amp; Repairs
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 leading-relaxed">
                    Maintenance coverage is <span className="text-emerald-400 font-bold">included</span> for{' '}
                    <span className="text-emerald-400 font-bold">{propertyName}</span>.
                  </p>
                </div>

                <div className="pt-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/90 mb-3">
                    YOU HAVE ACCESS TO
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-200">
                    {[
                      'Maintenance requests',
                      'Technician support',
                      'Repair tracking',
                      'Scheduled visits',
                      'Maintenance history',
                      'QR-based verification'
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="font-semibold text-slate-200">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Status & Go to Dashboard Button */}
              <div className="lg:col-span-3 lg:border-l lg:border-slate-800/80 lg:pl-8 flex flex-col justify-between h-full space-y-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>MAINTENANCE ACCESS</span>
                  </div>

                  <div className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight mt-1.5 drop-shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                    Included
                  </div>

                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">
                    You have full access to all maintenance services.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleOpenSubmit}
                    className="w-full px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm tracking-wide bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Create Request</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPropertyQrModal(true)}
                    className="w-full px-4 py-2.5 rounded-xl font-bold text-xs bg-[#061A1C] hover:bg-[#0A262A] border border-emerald-500/40 text-emerald-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/10"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>View QR Code</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" /> Full Protection Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary KPI Cards */}
          <TenantMaintenanceSummary requests={filteredRequests} theme={theme} />

          {/* Calendar & Upcoming Visits Side-by-Side Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TenantMaintenanceCalendar
                requests={filteredRequests}
                onSelectTicket={(t) => setSelectedTicket(t)}
                theme={theme}
              />
            </div>
            <div className="lg:col-span-1">
              <TenantUpcomingMaintenance
                requests={filteredRequests}
                onSelectTicket={(t) => setSelectedTicket(t)}
                theme={theme}
              />
            </div>
          </div>

          {/* Active Requests List */}
          <TenantMaintenanceRequests
            requests={filteredRequests}
            onSelectTicket={(t) => setSelectedTicket(t)}
            theme={theme}
          />

          {/* Maintenance History */}
          <TenantMaintenanceHistory
            requests={filteredRequests}
            onSelectTicket={(t) => setSelectedTicket(t)}
            onRefresh={fetchTenantData}
            theme={theme}
          />
        </div>
      ))}

      {/* Lease Selection Step Modal (When multiple leases exist) */}
      <AnimatePresence>
        {showLeaseSelectModal && (
          <TenantLeaseSelectModal
            leases={leases}
            onSelectLease={handleSelectLease}
            onClose={() => setShowLeaseSelectModal(false)}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* Submit Request Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <TenantMaintenanceRequestForm
            selectedLease={selectedLease}
            canChangeLease={leases.length > 1}
            onChangeLease={handleChangeLeaseFromForm}
            onClose={() => {
              setShowSubmitModal(false);
              setSelectedLease(null);
            }}
            onSave={() => {
              setShowSubmitModal(false);
              setSelectedLease(null);
              fetchTenantData();
            }}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* Request Details Drawer */}
      <AnimatePresence>
        {selectedTicket && (
          <TenantMaintenanceDetails
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
            onResolved={() => {
              setSelectedTicket(null);
              fetchTenantData();
            }}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* QR / Ticket ID Verification Modal */}
      <AnimatePresence>
        {showVerifyModal && (
          <TenantMaintenanceVerifyModal
            onClose={() => setShowVerifyModal(false)}
            onResolved={() => {
              setShowVerifyModal(false);
              fetchTenantData();
            }}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* How It Works Modal */}
      <AnimatePresence>
        {showHowItWorksModal && (
          <TenantMaintenanceHowItWorksModal
            isOpen={showHowItWorksModal}
            onClose={() => setShowHowItWorksModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ══ UNLOCK MAINTENANCE MODAL ══ */}
      <AnimatePresence>
        {showUnlockModal && currentLease && (
          <TenantMaintenanceUnlockModal
            isOpen={showUnlockModal}
            lease={currentLease}
            fee={currentLease.maintenanceFee || accessConfig.fee}
            frequency={accessConfig.frequency}
            onClose={() => setShowUnlockModal(false)}
            onSuccess={() => {
              setShowUnlockModal(false);
              fetchTenantData();
            }}
          />
        )}
      </AnimatePresence>

      {/* ══ PROPERTY MAINTENANCE QR IDENTITY MODAL ══ */}
      <AnimatePresence>
        {showPropertyQrModal && currentLease && (
          <TenantPropertyQrModal
            isOpen={showPropertyQrModal}
            lease={currentLease}
            property={currentLease?.property}
            onClose={() => setShowPropertyQrModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


