import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileCheck,
  Search,
  Filter,
  UserCheck,
  CheckCircle,
  XCircle,
  Download,
  Clock,
  AlertTriangle,
  ChevronRight,
  UserPlus,
  RefreshCw,
  Eye,
} from 'lucide-react';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  VerificationStatusBadge,
  TrustScoreBadge,
  RiskFlagBadge,
} from '../../../components/verification';

import getVerificationMapper from '../../../mappers/verificationMapperFactory';
import { MOCK_SAVED_VIEWS, MOCK_REVIEWERS } from '../../../mocks/adminVerificationMock';
import trackEvent, { VERIFICATION_EVENTS } from '../../../utils/verificationAnalytics';

export default function AdminVerificationQueue() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mapper = getVerificationMapper('ADMIN');

  const [queue, setQueue] = useState([]);
  const [selectedView, setSelectedView] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [reviewerFilter, setReviewerFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    const rawQueue = mapper.mapQueue(null);
    setQueue(rawQueue);

    // Support URL search params e.g. ?filter=SLA_BREACHED
    const filterParam = searchParams.get('filter');
    if (filterParam) {
      setSelectedView(filterParam);
    }
    trackEvent(VERIFICATION_EVENTS.ADMIN_QUEUE_OPEN);
  }, [searchParams]);

  // Handle Preset Filter View click
  const handleSelectView = (viewKey) => {
    setSelectedView(viewKey);
    if (viewKey === 'HIGH_RISK') setRiskFilter('HIGH');
    else if (viewKey === 'SLA_BREACHED') setStatusFilter('ALL');
    else if (viewKey === 'REJECTED_TODAY') setStatusFilter('REJECTED');
    else if (viewKey === 'AWAITING_LEVEL_3') setStatusFilter('LEVEL_3_REVIEW');
    else {
      setRiskFilter('ALL');
      setStatusFilter('ALL');
    }
  };

  // Checkbox Selection
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredQueue.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredQueue.map((item) => item.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Actions
  const handleBulkApprove = () => {
    trackEvent(VERIFICATION_EVENTS.ADMIN_BULK_ACTION, { action: 'approve', count: selectedIds.length });
    alert(`Bulk Approved ${selectedIds.length} verification requests!`);
    setSelectedIds([]);
  };

  const handleBulkReject = () => {
    trackEvent(VERIFICATION_EVENTS.ADMIN_BULK_ACTION, { action: 'reject', count: selectedIds.length });
    alert(`Bulk Rejected ${selectedIds.length} verification requests!`);
    setSelectedIds([]);
  };

  const handleBulkAssign = (reviewerName) => {
    trackEvent(VERIFICATION_EVENTS.ADMIN_ASSIGN, { reviewer: reviewerName, count: selectedIds.length });
    setQueue((prev) =>
      prev.map((item) =>
        selectedIds.includes(item.id) ? { ...item, assignedReviewer: reviewerName } : item
      )
    );
    alert(`Assigned ${selectedIds.length} items to ${reviewerName}`);
    setSelectedIds([]);
  };

  const handleExportCSV = () => {
    trackEvent(VERIFICATION_EVENTS.ADMIN_EXPORT, { format: 'CSV' });
    alert('Exported verification queue data to CSV.');
  };

  const handleExportPDF = () => {
    trackEvent(VERIFICATION_EVENTS.ADMIN_EXPORT, { format: 'PDF' });
    alert('Exported verification queue report to PDF.');
  };

  // Filtering Logic
  const filteredQueue = queue.filter((item) => {
    if (selectedView === 'SLA_BREACHED' && item.slaStatus !== 'BREACHED') return false;
    if (selectedView === 'MY_REVIEWS' && item.assignedReviewer !== 'Alex Mercer') return false;
    if (entityFilter !== 'ALL' && item.entityType !== entityFilter) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (riskFilter !== 'ALL' && item.riskLevel !== riskFilter) return false;
    if (reviewerFilter === 'UNASSIGNED' && item.assignedReviewer !== 'Unassigned') return false;
    if (reviewerFilter === 'ASSIGNED' && item.assignedReviewer === 'Unassigned') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const vrf = (item.verificationNumber || '').toLowerCase();
      const name = (item.entityName || '').toLowerCase();
      const email = (item.email || '').toLowerCase();
      const phone = (item.phone || '').toLowerCase();
      return vrf.includes(q) || name.includes(q) || email.includes(q) || phone.includes(q);
    }
    return true;
  });

  return (
    <div className="p-6 sm:p-10 space-y-8">
      {/* Page Header */}
      <VerificationPageHeader
        title="Enterprise Verification Review Queue"
        subtitle="Filter, review, assign, approve, reject, and export verification requests across all 4 entity portals"
        icon={FileCheck}
        actionText="Export CSV"
        onAction={handleExportCSV}
      />

      {/* Preset Filter Saved Views Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {MOCK_SAVED_VIEWS.map((view) => (
          <button
            key={view.key}
            onClick={() => handleSelectView(view.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedView === view.key
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>{view.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedView === view.key ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {view.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search VRF #, Entity Name, Email, Phone..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Entity Filter */}
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Entity Types</option>
            <option value="MANAGER">Manager (Business)</option>
            <option value="TENANT">Tenant (Rental)</option>
            <option value="PROPERTY">Property (Listing)</option>
            <option value="TECHNICIAN">Technician (Skill)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="AUTO_REVIEW">Auto Review</option>
            <option value="LEVEL_1_REVIEW">Level 1 Review</option>
            <option value="LEVEL_2_REVIEW">Level 2 Review</option>
            <option value="LEVEL_3_REVIEW">Level 3 Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </select>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="LOW">Low Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="HIGH">High Risk</option>
            <option value="CRITICAL">Critical Risk</option>
          </select>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between gap-4 animate-in fade-in duration-200">
            <span className="text-xs font-semibold text-indigo-300">
              {selectedIds.length} Request(s) Selected
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkApprove}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve Selected
              </button>

              <button
                onClick={handleBulkReject}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject Selected
              </button>

              <select
                onChange={(e) => e.target.value && handleBulkAssign(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium"
              >
                <option value="">Assign Reviewer...</option>
                {MOCK_REVIEWERS.map((r) => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Enterprise Data Table */}
      <VerificationSectionCard title={`Verification Queue (${filteredQueue.length} Records)`} icon={FileCheck}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredQueue.length && filteredQueue.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-700 text-indigo-600"
                  />
                </th>
                <th className="py-3 px-3">VRF #</th>
                <th className="py-3 px-3">Entity</th>
                <th className="py-3 px-3">Applicant / Name</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Trust Score</th>
                <th className="py-3 px-3">Risk Level</th>
                <th className="py-3 px-3">Reviewer</th>
                <th className="py-3 px-3">Submitted</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredQueue.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded border-slate-700 text-indigo-600"
                    />
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-slate-200">{item.verificationNumber}</td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {item.entityType}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-100">{item.entityName}</p>
                    <p className="text-[10px] text-slate-500">{item.email}</p>
                  </td>
                  <td className="py-3 px-3"><VerificationStatusBadge status={item.status} /></td>
                  <td className="py-3 px-3"><TrustScoreBadge score={item.trustScore} /></td>
                  <td className="py-3 px-3"><RiskFlagBadge risk={item.riskLevel} /></td>
                  <td className="py-3 px-3 text-slate-300 font-medium">{item.assignedReviewer}</td>
                  <td className="py-3 px-3 text-slate-400">{new Date(item.submittedAt).toLocaleDateString()}</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => navigate(`/admin/verification/${item.id}`)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all"
                    >
                      Inspect Workspace
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </VerificationSectionCard>
    </div>
  );
}
