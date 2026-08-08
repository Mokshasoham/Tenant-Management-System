import React from 'react';
import { Building2, ShieldCheck, Award, MapPin, Calendar, Clock, Sparkles } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function PropertyHeader({ property, theme }) {
  if (!property) return null;

  return (
    <div className="space-y-4">
      {/* Property Title & Triple Liquid Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className={cn(
              "text-2xl sm:text-3xl font-black tracking-tight",
              theme === 'light' ? "text-slate-900" : "text-white"
            )}>
              {property.name}
            </h1>
            <span className="text-xs font-mono font-black px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-sm">
              {property.propertyId}
            </span>
          </div>

          <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
            <span>{property.address}</span>
          </p>
        </div>

        {/* Top-Right Triple Liquid Metrics Widget */}
        <div className={cn(
          "flex items-center gap-4 p-3 rounded-full border shadow-2xl backdrop-blur-2xl transition-all self-start md:self-auto",
          theme === 'light'
            ? "bg-white/80 border-slate-200/80 shadow-slate-200/50"
            : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
        )}>
          <div className="text-center px-3">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Trust Score</span>
            <span className="text-base font-black text-emerald-500">{property.trustScore}/100</span>
          </div>
          <div className="h-7 w-px bg-border/60" />
          <div className="text-center px-3">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Health Score</span>
            <span className="text-base font-black text-indigo-500">{property.healthScore}/100</span>
          </div>
          <div className="h-7 w-px bg-border/60" />
          <div className="text-center px-3">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Compliance</span>
            <span className="text-base font-black text-emerald-500">{property.complianceScore}%</span>
          </div>
        </div>
      </div>

      {/* Activity Ribbon Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(property.ribbonChips || []).map((chip, idx) => (
          <div
            key={idx}
            className={cn(
              "px-3.5 py-1.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap shadow-sm backdrop-blur-md transition-all",
              theme === 'light'
                ? "bg-white/80 border-slate-200 text-slate-700"
                : "bg-[#0c0d15]/60 border-white/10 text-slate-300"
            )}
          >
            <span className="opacity-60">{chip.label}:</span>
            <span className="text-indigo-500 font-extrabold">{chip.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
