import React from 'react';

export const ManagerWorkloadChart = ({ workload = [] }) => {
  const maxAssigned = Math.max(...workload.map(m => m.totalAssigned || 0), 5);

  return (
    <div className="p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Manager Workload Distribution</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-blue-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Active
          </span>
          <span className="flex items-center gap-1 text-red-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-red-500"></span> Escalated
          </span>
        </div>
      </div>

      {workload.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-xs text-slate-400">
          No manager workload data available
        </div>
      ) : (
        <div className="space-y-3.5 my-auto max-h-48 overflow-y-auto pr-1">
          {workload.map((m, idx) => {
            const total = m.totalAssigned || 0;
            const active = m.activeCount || 0;
            const escalated = m.escalatedCount || 0;
            const activePct = (active / maxAssigned) * 100;
            const escalatedPct = (escalated / maxAssigned) * 100;

            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                    {m.managerName || 'Unassigned'}
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {total} assigned <span className="text-slate-400 font-normal">({active} active)</span>
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${activePct}%` }}
                    title={`Active: ${active}`}
                  ></div>
                  <div
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${escalatedPct}%` }}
                    title={`Escalated: ${escalated}`}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ManagerWorkloadChart;
