import React from 'react';
import useManagerDashboard from './hooks/useManagerDashboard';
import AnalyticsFilterBar from './components/AnalyticsFilterBar';
import KpiCardsSection from './components/KpiCardsSection';
import AnalyticsChartsSection from './components/AnalyticsChartsSection';
import CampaignsTableSection from './components/CampaignsTableSection';
import UpcomingAndOverdueTables from './components/UpcomingAndOverdueTables';
import RecentActivityFeed from './components/RecentActivityFeed';
import QuickActionModal from './components/QuickActionModal';

export const ManagerCampaignDashboard = () => {
  const {
    filters,
    setFilters,
    resetFilters,
    dashboardData,
    campaignsData,
    isRefreshing,
    lastUpdated,
    // Section Loading states
    loadingSummary,
    loadingTrends,
    loadingRisk,
    loadingWorkload,
    loadingCampaigns,
    // Section Error states
    errorSummary,
    errorTrends,
    errorRisk,
    errorWorkload,
    errorCampaigns,
    // Quick Action Modal
    activeModal,
    openQuickAction,
    closeQuickAction,
    executeQuickAction,
    refresh
  } = useManagerDashboard();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
        <div>
          <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            Lease Renewal Automation
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight mt-1">
            Manager Campaign Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time analytics, SLA tracking, risk management, and automated campaign workflows.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar
        filters={filters}
        setFilters={setFilters}
        resetFilters={resetFilters}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
        lastUpdated={lastUpdated}
      />

      {/* 1. KPI Cards */}
      <KpiCardsSection
        summaryData={dashboardData?.summary || {}}
        loading={loadingSummary}
        error={errorSummary}
      />

      {/* 2. Visualization Charts (Error Isolated) */}
      <AnalyticsChartsSection
        trendsData={dashboardData?.trends || {}}
        riskData={dashboardData?.risk || {}}
        workloadData={dashboardData?.workload || {}}
        loading={loadingTrends || loadingRisk || loadingWorkload}
        error={errorTrends || errorRisk || errorWorkload}
      />

      {/* 3. Main Campaigns Data Table */}
      <CampaignsTableSection
        campaignsData={campaignsData}
        filters={filters}
        setFilters={setFilters}
        onQuickAction={openQuickAction}
        loading={loadingCampaigns}
        error={errorCampaigns}
      />

      {/* 4. Upcoming Expirations & Overdue Widgets */}
      <UpcomingAndOverdueTables
        workloadData={dashboardData?.workload || {}}
        onQuickAction={openQuickAction}
        loading={loadingWorkload}
      />

      {/* 5. Recent Activity Timeline Feed */}
      <RecentActivityFeed
        activityData={dashboardData?.recentActivity || []}
        loading={loadingSummary}
      />

      {/* Quick Action Drawer / Modal */}
      <QuickActionModal
        isOpen={activeModal.isOpen}
        type={activeModal.type}
        campaign={activeModal.campaign}
        onClose={closeQuickAction}
        onExecuteAction={executeQuickAction}
      />
    </div>
  );
};

export default ManagerCampaignDashboard;
