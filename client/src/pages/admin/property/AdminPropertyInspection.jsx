import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, ShieldCheck, FileText, Clock, KeyRound,
  Wrench, MessageSquare, History, FileCheck, ArrowLeft,
  AlertTriangle, RefreshCw, Star
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import useAuthStore from '../../../context/authStore';
import { cn } from '../../../utils/cn';

// Subcomponents
import PropertyHeader from './components/PropertyHeader';
import PropertyStatusBanner from './components/PropertyStatusBanner';
import PropertyQuickStats from './components/PropertyQuickStats';
import PropertyAdminActions from './components/PropertyAdminActions';

// Mappers & Mocks
import {
  mapPropertyDetails,
  mapGroupedDocuments,
  mapTimeline,
  mapAuditLog,
  mapCommunications,
  mapReports,
} from '../../../mappers/adminPropertyMapper';

// Lazy-Loaded Tabs
const PropertyOverviewTab = lazy(() => import('./components/PropertyOverviewTab'));
const PropertyVerificationTab = lazy(() => import('./components/PropertyVerificationTab'));
const PropertyDocumentsTab = lazy(() => import('./components/PropertyDocumentsTab'));
const PropertyTimelineTab = lazy(() => import('./components/PropertyTimelineTab'));
const PropertyLeaseHistoryTab = lazy(() => import('./components/PropertyLeaseHistoryTab'));
const PropertyMaintenanceTab = lazy(() => import('./components/PropertyMaintenanceTab'));
const PropertyReviewsTab = lazy(() => import('./components/PropertyReviewsTab'));
const PropertyCommunicationsTab = lazy(() => import('./components/PropertyCommunicationsTab'));
const PropertyAuditTab = lazy(() => import('./components/PropertyAuditTab'));
const PropertyReportsTab = lazy(() => import('./components/PropertyReportsTab'));

const TABS = [
  { id: 'overview', label: 'Overview & Media', icon: Building2 },
  { id: 'verification', label: 'Verification & Checklist', icon: ShieldCheck },
  { id: 'documents', label: 'Documents Repository', icon: FileText },
  { id: 'timeline', label: 'Timeline & Lifecycle', icon: Clock },
  { id: 'leases', label: 'Lease History', icon: KeyRound },
  { id: 'maintenance', label: 'Maintenance & AMC', icon: Wrench },
  { id: 'reviews', label: 'Tenant Reviews', icon: Star },
  { id: 'communications', label: 'Communications', icon: MessageSquare },
  { id: 'audit', label: 'Audit Trail', icon: History },
  { id: 'reports', label: 'Reports & Export', icon: FileCheck },
];

export default function AdminPropertyInspection() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [property, setProperty] = useState(null);
  const [documents, setDocuments] = useState({});
  const [timeline, setTimeline] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [reports, setReports] = useState([]);

  // Confirmation Modal State
  const [actionModal, setActionModal] = useState({ open: false, action: null, title: '' });
  const [justificationReason, setJustificationReason] = useState('');

  useEffect(() => {
    fetchPropertyData();
  }, [propertyId]);

  const fetchPropertyData = async () => {
    setLoading(true);
    try {
      setProperty(mapPropertyDetails(propertyId));
      setDocuments(mapGroupedDocuments(propertyId));
      setTimeline(mapTimeline(propertyId));
      setAuditLog(mapAuditLog(propertyId));
      setCommunications(mapCommunications(propertyId));
      setReports(mapReports(propertyId));
    } catch (err) {
      console.error('Error fetching property workspace data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAdminAction = (actionKey, title) => {
    setActionModal({ open: true, action: actionKey, title });
    setJustificationReason('');
  };

  const handleConfirmAction = () => {
    if (!justificationReason.trim()) return;

    let newStatus = property.status;
    if (actionModal.action === 'APPROVE') newStatus = 'VERIFIED';
    if (actionModal.action === 'REJECT') newStatus = 'REJECTED';
    if (actionModal.action === 'SUSPEND') newStatus = 'SUSPENDED';

    setProperty((prev) => ({ ...prev, status: newStatus }));

    const newAuditEntry = {
      id: `a_${Date.now()}`,
      timestamp: new Date().toISOString(),
      reviewer: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Admin',
      action: actionModal.action,
      remarks: justificationReason,
      ip: '192.168.1.1',
      session: 'sess_active',
    };

    setAuditLog((prev) => [newAuditEntry, ...prev]);
    setActionModal({ open: false, action: null, title: '' });
    setJustificationReason('');
  };

  if (loading || !property) {
    return (
      <div className={cn("min-h-screen p-8 flex items-center justify-center font-sans", theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#07070c] text-white")}>
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
          <span className="text-xs font-black">Loading 360° Enterprise Workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen relative overflow-hidden font-sans p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto transition-colors duration-300",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#07070c] text-slate-100"
    )}>
      {/* ── Ambient Mesh Radial Glow Backdrop ── */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500"
        style={{
          background: theme === 'light'
            ? 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.08), transparent 70%), radial-gradient(circle at 80% 50%, rgba(168, 85, 247, 0.05), transparent 50%)'
            : 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.16), transparent 70%), radial-gradient(circle at 80% 50%, rgba(168, 85, 247, 0.08), transparent 50%)',
        }}
      />

      {/* Single Breadcrumb Button */}
      <div className="relative z-10">
        <button
          onClick={() => navigate('/browse')}
          className={cn(
            "inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black border transition-all cursor-pointer shadow-xl hover:scale-105",
            theme === 'light'
              ? "bg-white/80 border-slate-200/80 text-slate-800 hover:bg-slate-100"
              : "bg-[#0c0d15]/80 border-white/10 text-slate-200 hover:bg-white/10"
          )}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Property Directory
        </button>
      </div>

      {/* Property Header Banner */}
      <div className="relative z-10">
        <PropertyHeader property={property} theme={theme} />
      </div>

      {/* Status SLA & Quick Stats */}
      <div className="relative z-10 space-y-4">
        <PropertyStatusBanner property={property} theme={theme} />
        <PropertyQuickStats property={property} theme={theme} />
        <PropertyAdminActions onExecute={handleExecuteAdminAction} theme={theme} />
      </div>

      {/* ══ LIQUIDMORTIC TABS NAVIGATION ══ */}
      <div className="relative z-10 overflow-x-auto scrollbar-none">
        <div className={cn(
          "inline-flex items-center gap-1.5 p-1.5 rounded-full border backdrop-blur-2xl shadow-2xl transition-all",
          theme === 'light' ? "bg-white/80 border-slate-200/80" : "bg-[#0c0d15]/80 border-white/10"
        )}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg scale-105"
                    : theme === 'light'
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      : "text-slate-400 hover:text-white hover:bg-white/10"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ TAB CONTENT DISPLAY ══ */}
      <div className="relative z-10">
        <Suspense fallback={
          <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
            Loading Tab Content...
          </div>
        }>
          {activeTab === 'overview' && <PropertyOverviewTab property={property} theme={theme} />}
          {activeTab === 'verification' && <PropertyVerificationTab property={property} theme={theme} />}
          {activeTab === 'documents' && <PropertyDocumentsTab property={property} documents={documents} theme={theme} />}
          {activeTab === 'timeline' && <PropertyTimelineTab timeline={timeline} theme={theme} />}
          {activeTab === 'leases' && <PropertyLeaseHistoryTab property={property} theme={theme} />}
          {activeTab === 'maintenance' && <PropertyMaintenanceTab property={property} theme={theme} />}
          {activeTab === 'reviews' && <PropertyReviewsTab property={property} theme={theme} />}
          {activeTab === 'communications' && <PropertyCommunicationsTab communications={communications} theme={theme} />}
          {activeTab === 'audit' && <PropertyAuditTab auditLog={auditLog} theme={theme} />}
          {activeTab === 'reports' && <PropertyReportsTab reports={reports} property={property} theme={theme} />}
        </Suspense>
      </div>

      {/* ══ HIGH RISK ACTION CONFIRMATION MODAL ══ */}
      <AnimatePresence>
        {actionModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn(
                "w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4",
                theme === 'light' ? "bg-white border-slate-200 text-slate-900" : "bg-[#0c0d15] border-white/10 text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black">{actionModal.title}</h3>
                  <p className="text-xs text-muted-foreground">Audit Reason Required</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">
                  Mandatory Audit Justification Reason:
                </label>
                <textarea
                  value={justificationReason}
                  onChange={(e) => setJustificationReason(e.target.value)}
                  placeholder="Enter detailed compliance justification reason for this administrative decision..."
                  rows={4}
                  className={cn(
                    "w-full p-3 rounded-2xl border text-xs focus:outline-none focus:border-indigo-500",
                    theme === 'light' ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-950 border-white/10 text-white"
                  )}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setActionModal({ open: false, action: null, title: '' })}
                  className="flex-1 py-2.5 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-900 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={!justificationReason.trim()}
                  className="flex-1 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-xl cursor-pointer"
                >
                  Confirm Action
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
