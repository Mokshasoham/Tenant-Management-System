import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Activity, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

import PropertyHeader from './components/PropertyHeader';
import PropertyStatusBanner from './components/PropertyStatusBanner';
import PropertyQuickStats from './components/PropertyQuickStats';
import PropertyAdminActions from './components/PropertyAdminActions';
import InspectionScheduler from './components/InspectionScheduler';
import { VerificationSectionCard } from '../../../components/verification';

import adminPropertyMapper from '../../../mappers/adminPropertyMapper';
import trackEvent, { VERIFICATION_EVENTS } from '../../../utils/verificationAnalytics';

// ── Lazy-Load All 9 Workspace Tabs ──
const PropertyOverviewTab = lazy(() => import('./components/PropertyOverviewTab'));
const PropertyVerificationTab = lazy(() => import('./components/PropertyVerificationTab'));
const PropertyDocumentsTab = lazy(() => import('./components/PropertyDocumentsTab'));
const PropertyTimelineTab = lazy(() => import('./components/PropertyTimelineTab'));
const PropertyLeaseHistoryTab = lazy(() => import('./components/PropertyLeaseHistoryTab'));
const PropertyMaintenanceTab = lazy(() => import('./components/PropertyMaintenanceTab'));
const PropertyCommunicationsTab = lazy(() => import('./components/PropertyCommunicationsTab'));
const PropertyAuditTab = lazy(() => import('./components/PropertyAuditTab'));
const PropertyReportsTab = lazy(() => import('./components/PropertyReportsTab'));

const TABS = [
  { key: 'OVERVIEW', label: 'Overview' },
  { key: 'VERIFICATION', label: 'Verification & Checklist' },
  { key: 'DOCUMENTS', label: 'Documents Repository' },
  { key: 'TIMELINE', label: 'Lifecycle Timeline' },
  { key: 'LEASE_HISTORY', label: 'Lease History' },
  { key: 'MAINTENANCE', label: 'Maintenance & AMC' },
  { key: 'COMMUNICATIONS', label: 'Communications' },
  { key: 'AUDIT', label: 'Audit Log' },
  { key: 'REPORTS', label: 'Reports Generator' },
];

export default function AdminPropertyInspection() {
  const { propertyId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [property, setProperty] = useState(null);

  useEffect(() => {
    const details = adminPropertyMapper.mapPropertyDetails(propertyId, null);
    setProperty(details);
    trackEvent(VERIFICATION_EVENTS.ADMIN_DETAILS_OPEN, { propertyId: details.propertyId });
  }, [propertyId]);

  if (!property) {
    return <div className="p-8 text-center text-slate-400">Loading 360° Property Inspection Workspace...</div>;
  }

  const handleActionConfirm = (actionType, reason) => {
    trackEvent(VERIFICATION_EVENTS.ADMIN_APPROVE, { action: actionType, reason, propertyId: property.propertyId });
    alert(`Action ${actionType} executed with reason: "${reason}" and logged to audit trail.`);
  };

  return (
    <div className="p-6 sm:p-10 space-y-8">
      {/* Property Workspace Header with Activity Ribbon */}
      <PropertyHeader property={property} />

      {/* Status Banner */}
      <PropertyStatusBanner property={property} />

      {/* Quick Stats Grid */}
      <PropertyQuickStats property={property} />

      {/* Admin Action Bar with Confirmation Reasons */}
      <PropertyAdminActions property={property} onActionConfirm={handleActionConfirm} />

      {/* Modular Inspection Scheduler */}
      <InspectionScheduler property={property} onSchedule={(sData) => console.log(sData)} />

      {/* 9 Tab Navigation Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lazy-Loaded Workspace Tab Content Container */}
      <div className="min-h-[400px]">
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Tab Content...</div>}>
          {activeTab === 'OVERVIEW' && <PropertyOverviewTab property={property} />}
          {activeTab === 'VERIFICATION' && <PropertyVerificationTab property={property} />}
          {activeTab === 'DOCUMENTS' && <PropertyDocumentsTab property={property} />}
          {activeTab === 'TIMELINE' && <PropertyTimelineTab property={property} />}
          {activeTab === 'LEASE_HISTORY' && <PropertyLeaseHistoryTab property={property} />}
          {activeTab === 'MAINTENANCE' && <PropertyMaintenanceTab property={property} />}
          {activeTab === 'COMMUNICATIONS' && <PropertyCommunicationsTab property={property} />}
          {activeTab === 'AUDIT' && <PropertyAuditTab property={property} />}
          {activeTab === 'REPORTS' && <PropertyReportsTab property={property} />}
        </Suspense>
      </div>

      {/* Future Production GIS & API Integration Hooks */}
      <VerificationSectionCard title="Future GIS & Compliance API Integration Hooks" icon={Lock}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            'OCR Document Verification API',
            'AI Document Validation Engine',
            'Automated Fraud Detection Engine',
            'State Land Registry Portal',
            'Municipal Property Tax DB',
            'Fire NOC Board API',
            'Utility Board Clearance API',
            'Drone Inspection GIS Layer',
          ].map((hook, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center justify-between opacity-60">
              <span className="text-xs text-slate-300 font-medium">{hook}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Disabled</span>
            </div>
          ))}
        </div>
      </VerificationSectionCard>
    </div>
  );
}
