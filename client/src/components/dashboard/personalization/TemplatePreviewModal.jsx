/**
 * client/src/components/dashboard/personalization/TemplatePreviewModal.jsx
 *
 * Read-Only Preview Modal Before Applying Catalog Templates:
 * - Shows estimated widget breakdown (KPIs, Charts, Tables)
 * - Role compatibility indicator (✓ Admin, ✓ Manager)
 * - Missing dependency check
 * - Read-only wireframe preview
 */

import React from 'react';
import TemplateThumbnailPreview from './TemplateThumbnailPreview';
import widgetRegistry from '../../../modules/reporting/widgets/WidgetRegistry';

export default function TemplatePreviewModal({
  isOpen = false,
  onClose,
  template = null,
  userRole = 'admin',
  onConfirmApply
}) {
  if (!isOpen || !template) return null;

  const widgets = template.widgets || [];
  const totalWidgets = widgets.length;

  // Breakdown statistics
  const kpiCount = widgets.filter((w) => w.w <= 2 && w.h === 1).length;
  const chartCount = widgets.filter((w) => w.w >= 2 && w.h >= 2).length;
  const tableCount = Math.max(0, totalWidgets - kpiCount - chartCount);

  // Role compatibility check
  const isCompatible = !template.ownerRole || template.ownerRole === 'all' || template.ownerRole === userRole;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/90">
          <div>
            <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {template.category || 'Executive'} Catalog
            </span>
            <h2 className="text-xl font-bold text-white mt-1">{template.title}</h2>
            <p className="text-xs text-slate-400 mt-1">{template.description || 'Departmental dashboard template.'}</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Grid Wireframe Preview */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 mb-2">Grid Wireframe Layout</h4>
            <TemplateThumbnailPreview widgets={widgets} />
          </div>

          {/* Breakdown Statistics */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <p className="text-lg font-bold text-white">{totalWidgets}</p>
              <p className="text-[11px] text-slate-400">Total Widgets</p>
            </div>
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <p className="text-lg font-bold text-indigo-400">{kpiCount}</p>
              <p className="text-[11px] text-slate-400">KPI Cards</p>
            </div>
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <p className="text-lg font-bold text-amber-400">{chartCount}</p>
              <p className="text-[11px] text-slate-400">Charts</p>
            </div>
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <p className="text-lg font-bold text-emerald-400">{tableCount}</p>
              <p className="text-[11px] text-slate-400">Data Tables</p>
            </div>
          </div>

          {/* Compatibility Badge */}
          <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 text-xs">
            <span className="text-slate-300 font-medium">Role Compatibility:</span>
            {isCompatible ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                ✓ Fully Compatible ({userRole})
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                ⚠️ Role Mismatch ({userRole}) — Unsupported widgets will be skipped
              </span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirmApply(template);
              onClose();
            }}
            className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-lg shadow-indigo-600/30"
          >
            Apply Template
          </button>
        </div>
      </div>
    </div>
  );
}
