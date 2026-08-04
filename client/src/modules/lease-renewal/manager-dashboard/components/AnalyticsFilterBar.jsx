import React from 'react';

export const AnalyticsFilterBar = ({
  filters = {},
  setFilters,
  resetFilters,
  isRefreshing = false,
  onRefresh,
  lastUpdated
}) => {
  const handleInputChange = (key, value) => {
    setFilters({ [key]: value, page: 1 });
  };

  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

  return (
    <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="text"
            placeholder="Search tenant, property, or campaign #..."
            value={filters.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
        </div>

        {/* Status Dropdown */}
        <select
          value={filters.status || ''}
          onChange={(e) => handleInputChange('status', e.target.value)}
          className="py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="created">Created</option>
          <option value="waiting_for_tenant">Waiting for Tenant</option>
          <option value="waiting_for_manager">Waiting for Manager</option>
          <option value="negotiating">Negotiating</option>
          <option value="pending_signature">Pending Signature</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="expired">Expired</option>
          <option value="escalated">Escalated</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Risk Band Selector */}
        <select
          value={filters.riskBand || ''}
          onChange={(e) => handleInputChange('riskBand', e.target.value)}
          className="py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
        >
          <option value="">All Risk Bands</option>
          <option value="critical">Critical Risk (0-30)</option>
          <option value="high">High Risk (31-50)</option>
          <option value="medium">Medium Risk (51-75)</option>
          <option value="low">Low Risk (76-100)</option>
        </select>

        {/* Start Date */}
        <input
          type="date"
          value={filters.startDate || ''}
          onChange={(e) => handleInputChange('startDate', e.target.value)}
          className="py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
        />

        {/* End Date */}
        <input
          type="date"
          value={filters.endDate || ''}
          onChange={(e) => handleInputChange('endDate', e.target.value)}
          className="py-2 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
        />

        {/* Reset & Refresh */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={resetFilters}
            className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Reset Filters
          </button>
          
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <span className={isRefreshing ? 'animate-spin inline-block' : ''}>🔄</span>
            {isRefreshing ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>
      </div>

      {formattedTime && (
        <div className="text-[10px] text-slate-400 text-right">
          Last updated: {formattedTime} (Auto-refreshes every 60s)
        </div>
      )}
    </div>
  );
};

export default AnalyticsFilterBar;
