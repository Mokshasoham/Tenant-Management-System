/**
 * client/src/components/dashboard/personalization/ImportPreviewModal.jsx
 *
 * Interactive Pre-Import Preview & Validation Dialog:
 * - Displays ImportSummary DTO (Valid vs Skipped widgets)
 * - Radio selection for Duplicate Strategy (REPLACE | CREATE_COPY | SKIP)
 * - Confirmation trigger
 */

import React, { useState } from 'react';

export default function ImportPreviewModal({
  isOpen = false,
  onClose,
  importSummary = null,
  onConfirmImport
}) {
  const [strategy, setStrategy] = useState('CREATE_COPY');

  if (!isOpen || !importSummary) return null;

  const isDuplicate = importSummary.duplicateStatus === 'EXACT_MATCH';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/90">
          <div>
            <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Schema v{importSummary.schemaVersion || 1} Package
            </span>
            <h2 className="text-xl font-bold text-white mt-1">Import Layout Package</h2>
            <p className="text-xs text-slate-400 mt-1">Target Profile: <span className="text-indigo-300 font-semibold">{importSummary.profileName}</span></p>
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
          {/* Statistics Grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <p className="text-lg font-bold text-white">{importSummary.totalWidgets || 0}</p>
              <p className="text-[11px] text-slate-400">Total Widgets</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <p className="text-lg font-bold text-emerald-400">{importSummary.validWidgets || 0}</p>
              <p className="text-[11px] text-emerald-300 font-medium">Valid Widgets</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <p className="text-lg font-bold text-amber-400">{importSummary.skippedWidgets || 0}</p>
              <p className="text-[11px] text-amber-300 font-medium">Skipped Widgets</p>
            </div>
          </div>

          {/* Skipped Alert */}
          {importSummary.skippedWidgets > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
              ⚠️ <span className="font-semibold">{importSummary.skippedWidgets} widget(s)</span> in this layout are not recognized or unauthorized for your role and will be skipped safely.
            </div>
          )}

          {/* Duplicate Resolution Control */}
          {isDuplicate && (
            <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700 space-y-3">
              <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>⚠️</span> Duplicate Profile Detected ('{importSummary.profileName}')
              </h4>
              <p className="text-xs text-slate-400">Select how to resolve this collision:</p>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    value="CREATE_COPY"
                    checked={strategy === 'CREATE_COPY'}
                    onChange={(e) => setStrategy(e.target.value)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Save as Copy (<span className="text-indigo-300">{importSummary.profileName} (Imported)</span>)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    value="REPLACE"
                    checked={strategy === 'REPLACE'}
                    onChange={(e) => setStrategy(e.target.value)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Overwrite Existing Layout Profile</span>
                </label>
              </div>
            </div>
          )}
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
              onConfirmImport(strategy);
              onClose();
            }}
            className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-lg shadow-indigo-600/30"
          >
            Confirm Import
          </button>
        </div>
      </div>
    </div>
  );
}
