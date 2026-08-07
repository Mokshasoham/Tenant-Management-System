import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function RiskOverviewBar({ riskSummary = {}, onSelectRisk }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Portfolio Risk Summary & Quick Inspection Filter</span>
        </div>
        <button className="text-slate-400 hover:text-slate-200">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <button
            onClick={() => onSelectRisk && onSelectRisk('CRITICAL')}
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-center transition-all"
          >
            <p className="text-[11px] font-bold text-rose-400">Critical Risk</p>
            <p className="text-xl font-extrabold text-white mt-0.5">{riskSummary.critical || 2}</p>
            <p className="text-[10px] text-rose-300 font-medium">Requires Audit</p>
          </button>

          <button
            onClick={() => onSelectRisk && onSelectRisk('HIGH')}
            className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-center transition-all"
          >
            <p className="text-[11px] font-bold text-amber-400">High Risk</p>
            <p className="text-xl font-extrabold text-white mt-0.5">{riskSummary.high || 6}</p>
            <p className="text-[10px] text-amber-300 font-medium">Action Needed</p>
          </button>

          <button
            onClick={() => onSelectRisk && onSelectRisk('MEDIUM')}
            className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-center transition-all"
          >
            <p className="text-[11px] font-bold text-indigo-400">Medium Risk</p>
            <p className="text-xl font-extrabold text-white mt-0.5">{riskSummary.medium || 8}</p>
            <p className="text-[10px] text-indigo-300 font-medium">Monitoring</p>
          </button>

          <button
            onClick={() => onSelectRisk && onSelectRisk('LOW')}
            className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-center transition-all"
          >
            <p className="text-[11px] font-bold text-emerald-400">Low Risk</p>
            <p className="text-xl font-extrabold text-white mt-0.5">{riskSummary.low || 22}</p>
            <p className="text-[10px] text-emerald-300 font-medium">Compliant</p>
          </button>
        </div>
      )}
    </div>
  );
}
