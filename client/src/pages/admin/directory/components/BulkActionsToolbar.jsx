import React from 'react';
import { CheckCircle, XCircle, UserPlus, Archive, Download, Printer, Share2, FileSpreadsheet, FileText } from 'lucide-react';

export default function BulkActionsToolbar({ selectedCount = 0, onAction }) {
  if (selectedCount === 0) return null;

  return (
    <div className="p-3.5 rounded-xl bg-indigo-600/10 border border-indigo-500/40 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
      <span className="text-xs font-bold text-indigo-300">
        {selectedCount} Property Record(s) Selected
      </span>

      <div className="flex items-center gap-2 flex-wrap text-xs">
        <button
          onClick={() => onAction && onAction('VERIFY')}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center gap-1"
        >
          <CheckCircle className="w-3.5 h-3.5" /> Verify
        </button>

        <button
          onClick={() => onAction && onAction('SUSPEND')}
          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all flex items-center gap-1"
        >
          <XCircle className="w-3.5 h-3.5" /> Suspend
        </button>

        <button
          onClick={() => onAction && onAction('ASSIGN')}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all flex items-center gap-1"
        >
          <UserPlus className="w-3.5 h-3.5" /> Assign Reviewer
        </button>

        <button
          onClick={() => onAction && onAction('ARCHIVE')}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all flex items-center gap-1"
        >
          <Archive className="w-3.5 h-3.5" /> Archive
        </button>

        <button
          onClick={() => onAction && onAction('EXPORT_EXCEL')}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold transition-all flex items-center gap-1"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
        </button>

        <button
          onClick={() => onAction && onAction('EXPORT_PDF')}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold transition-all flex items-center gap-1"
        >
          <FileText className="w-3.5 h-3.5" /> PDF
        </button>
      </div>
    </div>
  );
}
