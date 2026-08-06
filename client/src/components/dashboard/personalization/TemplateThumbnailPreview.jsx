/**
 * client/src/components/dashboard/personalization/TemplateThumbnailPreview.jsx
 *
 * 2D Miniature Wireframe Grid Preview Component:
 * Renders a compact visual representation of widget spans { x, y, w, h }
 * for Catalog marketplace cards.
 */

import React from 'react';

const MINI_SPAN_MAP = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4'
};

export default function TemplateThumbnailPreview({ widgets = [] }) {
  const activeWidgets = widgets.filter((w) => w.enabled !== false).slice(0, 6);

  return (
    <div className="w-full h-24 bg-slate-950/70 rounded-lg p-2 border border-slate-800 grid grid-cols-4 gap-1.5 overflow-hidden">
      {activeWidgets.map((w, idx) => {
        const colClass = MINI_SPAN_MAP[w.w] || MINI_SPAN_MAP[2];
        const isKpi = w.h === 1 && w.w <= 2;

        return (
          <div
            key={w.widgetId || idx}
            className={`${colClass} rounded border flex items-center justify-center transition-all ${
              isKpi
                ? 'bg-indigo-900/30 border-indigo-500/30 text-indigo-400'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
          >
            <div className="w-full h-full p-1 flex flex-col justify-between">
              <div className="w-2/3 h-1 bg-current opacity-40 rounded-full" />
              <div className="w-1/2 h-1 bg-current opacity-20 rounded-full" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
