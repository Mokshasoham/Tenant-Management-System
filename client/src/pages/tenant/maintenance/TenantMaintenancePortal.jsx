import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw, AlertCircle, Lock, CheckCircle2, Sparkles, Building2 } from 'lucide-react';
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

export default function TenantMaintenancePortal() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requests, setRequests] = useState([]);
  const [leases, setLeases] = useState([]);
  const [activePropertyLease, setActivePropertyLease] = useState(null);

  const [showLeaseSelectModal, setShowLeaseSelectModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
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

      // Preserve currently selected lease if still present, otherwise default to first
      setActivePropertyLease(prev => {
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
  }, []);

  useEffect(() => {
    fetchTenantData();
  }, [fetchTenantData]);

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
    if (leases.length > 1) {
      setShowLeaseSelectModal(true);
    } else {
      setSelectedLease(leases[0] || null);
      setShowSubmitModal(true);
    }
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

  return (
    <div className={cn(
      "min-h-screen p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans transition-colors duration-300",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#050508] text-slate-100"
    )}>
      {/* Header with Submit Request button */}
      <TenantMaintenanceHeader
        onSubmitClick={handleOpenSubmit}
        theme={theme}
        isLocked={isLocked}
      />

      {/* Multi-Property Lease Switcher (When tenant has multiple properties) */}
      {leases.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mr-1 flex items-center gap-1.5 shrink-0">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            Property:
          </span>
          {leases.map((l) => {
            const isSelected = (currentLease?._id || currentLease?.id) === (l._id || l.id);
            const isLeaseLocked = l.maintenanceEnabled === false;
            return (
              <button
                key={l._id || l.id}
                onClick={() => setActivePropertyLease(l)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{l.property?.name || l.propertyName || 'Property'}</span>
                {isLeaseLocked ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
                    Locked
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                    Included
                  </span>
                )}
              </button>
            );
          })}
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

      {/* ══ CONDITIONAL: LOCKED STATE VS ACTIVE MAINTENANCE DASHBOARD ══ */}
      {isLocked ? (
        /* 🔒 LOCKED MAINTENANCE STATE */
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl text-center space-y-6 max-w-2xl mx-auto my-8 animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto shadow-xl shadow-indigo-500/10">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Maintenance &amp; Repairs
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Maintenance coverage is not enabled for <strong className="text-slate-200">{currentLease?.property?.name || 'this property'}</strong>.
            </p>
          </div>

          {/* Benefit list */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 text-left space-y-3 max-w-lg mx-auto text-xs text-slate-300">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Get Access To:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Maintenance requests</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Technician support</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Repair tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Scheduled visits</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Maintenance history</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>QR-based verification</span>
              </div>
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <p className="text-xs text-slate-400">
              Maintenance Access:{' '}
              <strong className="text-indigo-400 font-mono text-sm">
                ₹{currentLease?.maintenanceFee || accessConfig.fee} / {accessConfig.frequency}
              </strong>
            </p>
            <button
              type="button"
              onClick={() => setShowUnlockModal(true)}
              className="px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Unlock Maintenance Feature
            </button>
          </div>
        </div>
      ) : (
        /* ✅ ACTIVE MAINTENANCE DASHBOARD */
        <>
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
        </>
      )}

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
    </div>
  );
}

