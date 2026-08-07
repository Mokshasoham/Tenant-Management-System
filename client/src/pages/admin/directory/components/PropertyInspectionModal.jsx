import React, { useState } from 'react';
import {
  X, ShieldCheck, FileText, CheckCircle, AlertTriangle, Activity, Wrench, Clock, Download,
  Send, MessageSquare, Award, User, RefreshCw, Eye
} from 'lucide-react';
import { VerificationStatusBadge, RiskFlagBadge, CircularProgress } from '../../../../components/verification';
import { MOCK_INTERNAL_NOTES } from '../../../../mocks/adminPropertyDirectoryMock';

const TABS = [
  { key: 'OVERVIEW', label: 'Overview' },
  { key: 'DOCUMENTS', label: 'Documents' },
  { key: 'CHECKLIST', label: 'Verification Checklist' },
  { key: 'TIMELINE', label: 'Timeline' },
  { key: 'MAINTENANCE', label: 'Maintenance' },
  { key: 'LEASE_HISTORY', label: 'Lease History' },
  { key: 'COMPLIANCE', label: 'Compliance History' },
  { key: 'INSPECTION_HISTORY', label: 'Inspection History' },
  { key: 'AUDIT', label: 'Audit Trail' },
  { key: 'REPORTS', label: 'Reports' },
  { key: 'NOTES', label: 'Internal Notes' },
];

export default function PropertyInspectionModal({ property, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [notes, setNotes] = useState(MOCK_INTERNAL_NOTES);
  const [newNote, setNewNote] = useState('');

  if (!isOpen || !property) return null;

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setNotes((prev) => [
      { id: `in_${Date.now()}`, author: 'Alex Mercer', timestamp: new Date().toISOString(), text: newNote.trim() },
      ...prev,
    ]);
    setNewNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/60">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">{property.name}</h2>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                {property.propertyId}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{property.address}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Triple Metrics Banner */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-4">
            <VerificationStatusBadge status={property.status} />
            <RiskFlagBadge risk={property.verificationPriority || 'LOW'} />
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-slate-400">Trust Score: </span>
              <strong className="text-emerald-400 font-extrabold">{property.trustScore}/100</strong>
            </div>
            <div>
              <span className="text-slate-400">Health Score: </span>
              <strong className="text-indigo-400 font-extrabold">{property.healthScore}/100</strong>
            </div>
            <div>
              <span className="text-slate-400">Compliance Rate: </span>
              <strong className="text-emerald-400 font-extrabold">{property.complianceScore}%</strong>
            </div>
          </div>
        </div>

        {/* Tab Header Navigation */}
        <div className="flex items-center gap-2 px-6 border-b border-slate-800 overflow-x-auto scrollbar-none py-2 bg-slate-950/20">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs text-slate-300">
          {activeTab === 'OVERVIEW' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <h4 className="font-bold text-white text-sm">Property Metadata</h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Monthly Rent</span>
                    <span className="text-emerald-400 font-mono font-bold">₹{property.price?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Property Type</span>
                    <span className="text-slate-200 uppercase font-bold">{property.type}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Owner</span>
                    <span className="text-slate-200 font-semibold">{property.ownerName}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Assigned Manager</span>
                    <span className="text-indigo-400 font-semibold">{property.managerName}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <h4 className="font-bold text-white text-sm">SLA & Inspection Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">SLA Timer Status</span>
                    <span className="text-amber-400 font-bold">{property.slaRemainingHours}h Remaining</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Last Inspection</span>
                    <span className="text-slate-200">{property.inspection?.lastInspectionDate}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Next Inspection</span>
                    <span className="text-indigo-400 font-semibold">{property.inspection?.nextInspectionDate}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Current Occupancy</span>
                    <span className="text-emerald-400 font-bold">{property.occupancyRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'CHECKLIST' && (
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm">Compliance Verification Checklist</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(property.compliance || {}).map(([key, status]) => (
                  <div key={key} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="capitalize font-medium text-slate-200">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${status === 'PASSED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'NOTES' && (
            <div className="space-y-4">
              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add internal compliance case note..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold">
                  Add Note
                </button>
              </form>

              <div className="space-y-2 pt-2">
                {notes.map((n) => (
                  <div key={n.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-bold text-slate-200">{n.author}</span>
                      <span>{new Date(n.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-300">{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'REPORTS' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 text-center">
              <h4 className="font-bold text-white">Generate Property Directory Report</h4>
              <p className="text-slate-400">Export complete GIS compliance audit for {property.name}</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => alert('Exporting PDF...')} className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold">
                  Export PDF
                </button>
                <button onClick={() => alert('Exporting Excel...')} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold">
                  Export Excel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
