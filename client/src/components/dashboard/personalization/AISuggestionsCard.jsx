/**
 * client/src/components/dashboard/personalization/AISuggestionsCard.jsx
 *
 * AI Layout Recommendation Banner Component:
 * Displays AI confidence metrics, layout rationale, and one-click layout application.
 */

import React from 'react';

export default function AISuggestionsCard({
  suggestions = null,
  onApplySuggestions
}) {
  if (!suggestions) return null;

  return (
    <div className="p-5 mb-6 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl shadow-xl flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-indigo-600/30 text-indigo-300 rounded-xl border border-indigo-500/40 text-xl">
          ✨
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-white tracking-wide">
              AI Layout Recommendation
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {Math.round((suggestions.confidence || 0.92) * 100)}% Match
            </span>
          </div>
          <p className="text-xs text-slate-300">
            {suggestions.reason || 'Recommended optimal layout based on operational activity patterns.'}
          </p>
        </div>
      </div>

      <button
        onClick={() => onApplySuggestions && onApplySuggestions(suggestions.suggestedWidgets)}
        className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 whitespace-nowrap"
      >
        <span>Apply AI Layout</span>
        <span>→</span>
      </button>
    </div>
  );
}
