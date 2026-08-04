import React from 'react';

const STATUS_COLORS = {
  draft: '#94a3b8',
  created: '#3b82f6',
  waiting_for_tenant: '#8b5cf6',
  waiting_for_manager: '#f59e0b',
  negotiating: '#06b6d4',
  pending_signature: '#ec4899',
  approved: '#10b981',
  completed: '#059669',
  expired: '#64748b',
  escalated: '#ef4444',
  cancelled: '#cbd5e1'
};

export const StatusDonutChart = ({ data = [] }) => {
  const total = data.reduce((acc, curr) => acc + (curr.count || 0), 0);

  let cumulativeAngle = 0;
  const slices = data.map((item) => {
    const status = item.status || item._id || 'other';
    const count = item.count || 0;
    const percentage = total > 0 ? (count / total) * 100 : 0;
    const angle = total > 0 ? (count / total) * 360 : 0;

    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    const endAngle = cumulativeAngle;

    return {
      status,
      count,
      percentage,
      color: STATUS_COLORS[status] || '#64748b',
      startAngle,
      endAngle
    };
  });

  // Calculate SVG arc path
  const getArcPath = (startAngle, endAngle) => {
    const cx = 100;
    const cy = 100;
    const r = 70;

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Status Distribution</h3>
        <span className="text-xs text-slate-500 font-medium">{total} total</span>
      </div>

      {total === 0 ? (
        <div className="h-48 flex items-center justify-center text-xs text-slate-400">
          No status distribution data available
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
              {slices.map((slice, i) => (
                <path
                  key={i}
                  d={getArcPath(slice.startAngle, slice.endAngle)}
                  fill={slice.color}
                  className="transition-all duration-300 hover:opacity-85 cursor-pointer"
                />
              ))}
              <circle cx="100" cy="100" r="45" className="fill-white dark:fill-slate-900" />
            </svg>
            <div className="absolute text-center">
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{total}</span>
              <span className="block text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Total</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs max-h-36 overflow-y-auto pr-1">
            {slices.map((s, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }}></span>
                <span className="capitalize text-slate-600 dark:text-slate-400 truncate max-w-[80px]">
                  {s.status.replace(/_/g, ' ')}
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 ml-auto">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusDonutChart;
