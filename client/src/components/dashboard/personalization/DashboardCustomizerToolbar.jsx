/**
 * client/src/components/dashboard/personalization/DashboardCustomizerToolbar.jsx
 *
 * Header Control Bar for Dashboard Personalization:
 * - Edit Mode Toggle
 * - Optimistic Auto-Save Status Indicator (Saved ✓ / Saving... / Conflict 409)
 * - Reset Layout to Default
 */

import React from 'react';

export default function DashboardCustomizerToolbar({
  isEditMode,
  onToggleEditMode,
  saveStatus = 'idle', // 'idle' | 'saving' | 'saved' | 'conflict' | 'error'
  onResetLayout,
  profileName = 'Default'
}) {
  return (
    <div className="flex items-center justify-between p-4 mb-6 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">
            Dashboard Layout
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
              Profile: {profileName}
            </span>
          </h3>
          <p className="text-xs text-slate-400">Customize widgets, spans, and position preferences.</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Optimistic Auto-Save Status Badge */}
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Saving...
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            ✓ Saved
          </span>
        )}
        {saveStatus === 'conflict' && (
          <span className="flex items-center gap-1 text-xs text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
            ⚠️ Session Conflict (409)
          </span>
        )}

        {/* Reset Layout */}
        <button
          onClick={onResetLayout}
          className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
        >
          Reset Default
        </button>

        {/* Toggle Edit Mode */}
        <button
          onClick={onToggleEditMode}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-md ${
            isEditMode
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30'
          }`}
        >
          {isEditMode ? 'Done Editing' : 'Customize Layout'}
        </button>
      </div>
    </div>
  );
}
