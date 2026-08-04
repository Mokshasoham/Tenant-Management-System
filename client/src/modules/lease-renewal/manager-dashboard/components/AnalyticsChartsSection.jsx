import React from 'react';
import StatusDonutChart from './StatusDonutChart';
import TrendLineChart from './TrendLineChart';
import RiskBarChart from './RiskBarChart';
import ManagerWorkloadChart from './ManagerWorkloadChart';
import ChartsSkeleton from './skeletons/ChartsSkeleton';

export const AnalyticsChartsSection = ({
  trendsData = {},
  riskData = {},
  workloadData = {},
  loading = false,
  error = null
}) => {
  if (loading) return <ChartsSkeleton />;

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/60 text-center py-10">
        <span className="text-red-500 text-2xl font-bold block mb-1">⚠️</span>
        <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">Analytics Charts Unavailable</h4>
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <StatusDonutChart data={trendsData?.statusDistribution || []} />
      <TrendLineChart data={trendsData?.monthlyTrends || []} />
      <RiskBarChart bands={riskData?.bands || []} />
      <ManagerWorkloadChart workload={workloadData?.managerWorkload || []} />
    </div>
  );
};

export default AnalyticsChartsSection;
