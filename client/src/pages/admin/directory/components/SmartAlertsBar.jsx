import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Bell, CheckCircle2, ShieldAlert, FileText, Clock } from 'lucide-react';

export default function SmartAlertsBar({ alerts = [], onSelectFilter }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <Bell className="w-4 h-4 text-indigo-400" />
          <span>Smart System Alerts & Compliance Notifications ({alerts.length})</span>
        </div>
        <button className="text-slate-400 hover:text-slate-200">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
          {alerts.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectFilter && onSelectFilter(item.filterKey)}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900 transition-all text-left group flex items-start justify-between"
            >
              <div>
                <p className="text-[11px] font-bold text-slate-200 group-hover:text-indigo-300">{item.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Click to filter properties</p>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700">
                {item.count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
