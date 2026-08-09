import React from 'react';
import { ShieldCheck, Calendar as CalendarIcon, Radio } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function ManagerMaintenanceHeader({ theme }) {
  const todayStr = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/20">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-purple-400 to-indigo-600" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-600 dark:text-purple-400">
              Operations Center
            </p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Maintenance Operations
          </h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Manage maintenance requests & dispatch technicians across your assigned property portfolio
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className={cn(
          "px-4 py-2 rounded-2xl border text-xs font-mono font-bold flex items-center gap-2 shadow-sm backdrop-blur-md",
          theme === 'light' ? "bg-white/80 border-slate-200" : "bg-[#0c0d15]/80 border-white/10"
        )}>
          <CalendarIcon className="w-4 h-4 text-purple-400" />
          <span>Today, {todayStr}</span>
        </div>

        <span className="px-3.5 py-2 rounded-2xl text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> ● LIVE
        </span>
      </div>
    </div>
  );
}
