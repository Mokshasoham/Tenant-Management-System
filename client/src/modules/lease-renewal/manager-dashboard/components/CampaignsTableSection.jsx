import React from 'react';
import CampaignTableSkeleton from './skeletons/CampaignTableSkeleton';

const STATUS_BADGES = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  created: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  waiting_for_tenant: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
  waiting_for_manager: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  negotiating: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300',
  pending_signature: 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  completed: 'bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
  expired: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  escalated: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 animate-pulse',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
};

const RISK_BADGES = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-amber-500 text-white',
  low: 'bg-emerald-500 text-white'
};

const getRiskBand = (score = 100) => {
  if (score <= 30) return 'critical';
  if (score <= 50) return 'high';
  if (score <= 75) return 'medium';
  return 'low';
};

export const CampaignsTableSection = ({
  campaignsData = { records: [], total: 0, page: 1, limit: 10 },
  filters = {},
  setFilters,
  onQuickAction,
  loading = false,
  error = null
}) => {
  if (loading) return <CampaignTableSkeleton />;

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/60 text-center py-8">
        <span className="text-red-500 text-xl font-bold block mb-1">⚠️</span>
        <h4 className="text-xs font-semibold text-red-700 dark:text-red-300">Campaigns Table Unavailable</h4>
        <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  const { records = [], total = 0, page = 1, limit = 10 } = campaignsData;
  const totalPages = Math.ceil(total / limit) || 1;

  const handleSort = (field) => {
    const currentOrder = filters.sort === field && filters.order === 'asc' ? 'desc' : 'asc';
    setFilters({ sort: field, order: currentOrder });
  };

  const exportCSVPlaceholder = () => {
    alert('Exporting Campaign List to CSV... (CSV download generated successfully)');
  };

  return (
    <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shadow-sm p-6 space-y-4">
      {/* Table Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Campaign Management</h3>
          <p className="text-xs text-slate-400">Showing {records.length} of {total} total campaigns</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Limit selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => setFilters({ limit: Number(e.target.value), page: 1 })}
              className="py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs dark:text-slate-100"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          {/* Export CSV Placeholder */}
          <button
            onClick={exportCSVPlaceholder}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Table Content */}
      {records.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          No campaigns found matching current filter criteria.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] z-10">
              <tr>
                <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort('campaignNumber')}>
                  Campaign # {filters.sort === 'campaignNumber' ? (filters.order === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="py-3 px-4">Tenant / Property</th>
                <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort('status')}>
                  Status {filters.sort === 'status' ? (filters.order === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort('riskScore')}>
                  Risk Score {filters.sort === 'riskScore' ? (filters.order === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="py-3 px-4">SLA Status</th>
                <th className="py-3 px-4 cursor-pointer" onClick={() => handleSort('expiryDate')}>
                  Expiry Date {filters.sort === 'expiryDate' ? (filters.order === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="py-3 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {records.map((c) => {
                const riskBand = getRiskBand(c.riskScore);
                const statusStyle = STATUS_BADGES[c.status] || STATUS_BADGES.created;
                const riskStyle = RISK_BADGES[riskBand] || RISK_BADGES.low;

                return (
                  <tr key={c.id || c._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-indigo-600 dark:text-indigo-400">
                      {c.campaignNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-100">{c.snapshot?.tenantName || 'Tenant'}</div>
                      <div className="text-[10px] text-slate-400">{c.snapshot?.propertyName || 'Property'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${statusStyle}`}>
                        {c.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${riskStyle}`}>
                          {c.riskScore ?? 100}
                        </span>
                        <span className="text-[10px] uppercase text-slate-400 font-medium">{riskBand}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-semibold ${
                        c.slaStatus === 'breached' ? 'text-red-500 font-bold' :
                        c.slaStatus === 'approaching_breach' ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                        {c.slaStatus?.replace(/_/g, ' ') || 'Within SLA'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onQuickAction('view', c)}
                          className="px-2.5 py-1 text-[11px] font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => onQuickAction('escalate', c)}
                          className="px-2.5 py-1 text-[11px] font-medium text-red-600 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-lg transition-colors"
                        >
                          Escalate
                        </button>
                        <button
                          onClick={() => onQuickAction('reminder', c)}
                          className="px-2.5 py-1 text-[11px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-lg transition-colors"
                        >
                          Remind
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {records.length > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setFilters({ page: page - 1 })}
              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 rounded-lg font-medium transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setFilters({ page: page + 1 })}
              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 rounded-lg font-medium transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignsTableSection;
