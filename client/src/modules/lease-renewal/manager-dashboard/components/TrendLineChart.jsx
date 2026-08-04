import React from 'react';

export const TrendLineChart = ({ data = [] }) => {
  const maxCount = Math.max(...data.map(d => Math.max(d.created || 0, d.completed || 0)), 5);
  const height = 140;
  const width = 320;
  const padding = 20;

  const pointsCreated = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - 2 * padding);
    const y = height - padding - ((d.created || 0) / maxCount) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  const pointsCompleted = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - 2 * padding);
    const y = height - padding - ((d.completed || 0) / maxCount) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Monthly Campaign Trend</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-indigo-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Created
          </span>
          <span className="flex items-center gap-1 text-emerald-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completed
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-xs text-slate-400">
          No timeline trend data available
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36">
            {/* Grid lines */}
            {[0, 0.5, 1].map((ratio, idx) => (
              <line
                key={idx}
                x1={padding}
                y1={height - padding - ratio * (height - 2 * padding)}
                x2={width - padding}
                y2={height - padding - ratio * (height - 2 * padding)}
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeDasharray="3 3"
              />
            ))}

            {/* Lines */}
            {pointsCreated && (
              <polyline
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                points={pointsCreated}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {pointsCompleted && (
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                points={pointsCompleted}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Points */}
            {data.map((d, i) => {
              const x = padding + (i / Math.max(data.length - 1, 1)) * (width - 2 * padding);
              const yC = height - padding - ((d.created || 0) / maxCount) * (height - 2 * padding);
              const yM = height - padding - ((d.completed || 0) / maxCount) * (height - 2 * padding);
              return (
                <g key={i}>
                  <circle cx={x} cy={yC} r="3.5" className="fill-indigo-600 stroke-white dark:stroke-slate-900" />
                  <circle cx={x} cy={yM} r="3.5" className="fill-emerald-500 stroke-white dark:stroke-slate-900" />
                </g>
              );
            })}
          </svg>

          {/* Month Labels */}
          <div className="flex justify-between px-3 text-[10px] text-slate-400 mt-1">
            {data.map((d, i) => (
              <span key={i}>{d.yearMonth || d._id}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendLineChart;
