/**
 * client/src/components/dashboard/personalization/DashboardStudioActivityLog.jsx
 *
 * Studio Activity Log Component:
 * Displays recent dashboard customization, profile switches, and import/export audit events.
 */

import React from 'react';

export default function DashboardStudioActivityLog({ events = [] }) {
  if (!events || events.length === 0) {
    return (
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
        No recent Studio activity events recorded.
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl">
      <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
        Studio Activity Log
      </h4>

      <div className="space-y-3">
        {events.map((evt, idx) => (
          <div
            key={idx}
            className="flex items-start justify-between p-3 bg-slate-800/40 rounded-lg border border-slate-700/50 text-xs"
          >
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {evt.action || 'ACTIVITY'}
              </span>
              <span className="text-slate-200 font-medium">{evt.details}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
