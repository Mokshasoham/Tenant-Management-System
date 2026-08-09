import React from 'react';
import { Radio, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function MaintenanceHeader({ theme }) {
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
      {/* Title & Subtitle */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className={cn(
            "text-2xl sm:text-3xl font-black tracking-tight",
            theme === 'light' ? "text-slate-900" : "text-white"
          )}>
            Maintenance Command Center
          </h1>
        </div>
        <p className="text-xs text-muted-foreground font-medium mt-1">
          Monitor maintenance activity across your property portfolio
        </p>
      </div>

      {/* Right Side: Date & Live Indicator (NO SUBMIT CTA) */}
      <div className="flex items-center gap-3">
        <div className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-full border shadow-xl backdrop-blur-2xl text-xs font-bold transition-all",
          theme === 'light'
            ? "bg-white/80 border-slate-200/80 shadow-slate-200/50 text-slate-700"
            : "bg-[#0c0d15]/80 border-white/10 shadow-black/40 text-slate-300"
        )}>
          <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
          <span>Today, {currentDate}</span>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-black shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
          Live ●
        </div>
      </div>
    </div>
  );
}
