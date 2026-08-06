/**
 * client/src/components/dashboard/personalization/DashboardGridEngine.jsx
 *
 * 2D CSS Grid Layout Engine rendering customizable widgets according to semantic
 * coordinates { x, y, w, h } and widget-level settings.
 * Supports Edit Mode, column resizing (1 to 4 cols), move reordering, and single-widget resets.
 */

import React from 'react';
import widgetRegistry from '../../../modules/reporting/widgets/WidgetRegistry';

const COLUMN_SPAN_MAP = {
  1: 'col-span-1 md:col-span-1',
  2: 'col-span-1 md:col-span-2',
  3: 'col-span-1 md:col-span-3',
  4: 'col-span-1 md:col-span-4'
};

export default function DashboardGridEngine({
  widgets = [],
  isEditMode = false,
  onUpdateWidget,
  onRemoveWidget,
  onResetSingleWidget
}) {
  const activeWidgets = widgets.filter((w) => w.enabled !== false);

  if (activeWidgets.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-800/50 rounded-xl border border-slate-700/50">
        <p className="text-slate-400 font-medium">No active widgets in this layout.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {activeWidgets.map((w, index) => {
        const meta = widgetRegistry.get(w.widgetId) || { name: w.widgetId, locked: false };
        const colClass = COLUMN_SPAN_MAP[w.w] || COLUMN_SPAN_MAP[2];

        return (
          <div
            key={w.widgetId}
            className={`relative transition-all duration-200 ${colClass} ${
              isEditMode
                ? 'ring-2 ring-indigo-500/40 rounded-xl bg-slate-900/60 p-2 shadow-lg shadow-indigo-950/20'
                : ''
            }`}
          >
            {/* Edit Mode Header Overlay */}
            {isEditMode && (
              <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-slate-800/90 rounded-lg border border-slate-700/60 text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  {meta.name || w.widgetId}
                  {meta.locked && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                      Locked
                    </span>
                  )}
                </span>

                <div className="flex items-center gap-1">
                  {/* Move Left / Up */}
                  {index > 0 && (
                    <button
                      onClick={() => {
                        const newWidgets = [...widgets];
                        const swapIdx = index - 1;
                        [newWidgets[index], newWidgets[swapIdx]] = [newWidgets[swapIdx], newWidgets[index]];
                        onUpdateWidget(newWidgets);
                      }}
                      className="px-1.5 py-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                      title="Move Up"
                    >
                      ←
                    </button>
                  )}

                  {/* Move Right / Down */}
                  {index < activeWidgets.length - 1 && (
                    <button
                      onClick={() => {
                        const newWidgets = [...widgets];
                        const swapIdx = index + 1;
                        [newWidgets[index], newWidgets[swapIdx]] = [newWidgets[swapIdx], newWidgets[index]];
                        onUpdateWidget(newWidgets);
                      }}
                      className="px-1.5 py-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                      title="Move Down"
                    >
                      →
                    </button>
                  )}

                  {/* Decrease Width */}
                  <button
                    disabled={w.w <= 1}
                    onClick={() => {
                      const updated = widgets.map((item) =>
                        item.widgetId === w.widgetId ? { ...item, w: Math.max(1, item.w - 1) } : item
                      );
                      onUpdateWidget(updated);
                    }}
                    className="px-1.5 py-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-30"
                    title="Narrower (Columns)"
                  >
                    -
                  </button>

                  <span className="text-[11px] text-indigo-300 font-mono px-1">{w.w}x{w.h || 1}</span>

                  {/* Increase Width */}
                  <button
                    disabled={w.w >= 4}
                    onClick={() => {
                      const updated = widgets.map((item) =>
                        item.widgetId === w.widgetId ? { ...item, w: Math.min(4, item.w + 1) } : item
                      );
                      onUpdateWidget(updated);
                    }}
                    className="px-1.5 py-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-30"
                    title="Wider (Columns)"
                  >
                    +
                  </button>

                  {/* Single Widget Reset */}
                  {onResetSingleWidget && (
                    <button
                      onClick={() => onResetSingleWidget(w.widgetId)}
                      className="px-1.5 py-0.5 hover:bg-slate-700 rounded text-indigo-400 hover:text-indigo-200"
                      title="Reset Widget Dimensions & Settings"
                    >
                      ↺
                    </button>
                  )}

                  {/* Remove Widget (if not locked) */}
                  {!meta.locked && onRemoveWidget && (
                    <button
                      onClick={() => onRemoveWidget(w.widgetId)}
                      className="px-1.5 py-0.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded ml-1"
                      title="Hide Widget"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Widget Component Content */}
            {meta.component ? (
              <meta.component settings={w.settings || {}} />
            ) : (
              <div className="p-6 bg-slate-800/80 rounded-xl border border-slate-700 text-slate-300">
                <h4 className="font-semibold text-indigo-400">{meta.name || w.widgetId}</h4>
                <p className="text-xs text-slate-400 mt-1">Widget ID: {w.widgetId}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
