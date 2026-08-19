import React from 'react';
import { Wrench, BookOpen } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function TenantMaintenanceHeader({ onHowItWorksClick, theme }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Left: Icon & Titles */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 border border-amber-400/30 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
          <Wrench className="w-7 h-7 stroke-[2.2]" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-amber-500">
              TENANT PORTAL
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Maintenance &amp; Repairs
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
            Manage and track all your property maintenance requests
          </p>
        </div>
      </div>

      {/* Right: How It Works Button */}
      <button
        type="button"
        onClick={onHowItWorksClick}
        className="px-5 py-2.5 rounded-2xl bg-[#0B1328]/80 hover:bg-[#101C3D] border border-amber-500/50 hover:border-amber-400 text-amber-400 hover:text-amber-300 font-bold text-xs sm:text-sm shadow-md hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer self-start sm:self-center shrink-0 hover:scale-[1.02] active:scale-[0.98]"
      >
        <BookOpen className="w-4 h-4 text-amber-400" />
        <span>How It Works</span>
      </button>
    </div>
  );
}

