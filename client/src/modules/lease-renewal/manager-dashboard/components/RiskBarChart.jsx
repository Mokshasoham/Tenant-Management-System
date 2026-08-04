import React from 'react';

const RISK_BAND_COLORS = {
  critical: { bg: 'bg-red-500', bar: '#ef4444', text: 'text-red-500' },
  high: { bg: 'bg-orange-500', bar: '#f97316', text: 'text-orange-500' },
  medium: { bg: 'bg-amber-500', bar: '#f59e0b', text: 'text-amber-500' },
  low: { bg: 'bg-emerald-500', bar: '#10b981', text: 'text-emerald-500' }
};

export const RiskBarChart = ({ bands = [] }) => {
  const total = bands.reduce((acc, curr) => acc + (curr.count || 0), 0);

  return (
    <div className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Risk Score Distribution</h3>
        <span className="text-xs text-slate-500 font-medium">{total} evaluated</span>
      </div>

      <div className="space-y-3.5 my-auto">
        {bands.map((band, idx) => {
          const key = band.key || 'low';
          const style = RISK_BAND_COLORS[key] || RISK_BAND_COLORS.low;
          const count = band.count || 0;
          const percentage = band.percentage || 0;

          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{band.label || key}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {count} <span className="text-slate-400 font-normal">({percentage.toFixed(1)}%)</span>
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${style.bg}`}
                  style={{ width: `${Math.max(percentage, count > 0 ? 5 : 0)}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskBarChart;
