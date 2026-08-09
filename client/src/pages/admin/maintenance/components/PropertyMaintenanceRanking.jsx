import React from 'react';
import { Building2, AlertTriangle, ArrowRight, Activity, ShieldAlert } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function PropertyMaintenanceRanking({ properties = [], onSelectProperty, theme }) {
  return (
    <div className={cn(
      "p-5 rounded-[2rem] border shadow-2xl space-y-4 backdrop-blur-2xl transition-all flex flex-col justify-between",
      theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
    )}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className={cn("text-sm font-black tracking-tight", theme === 'light' ? "text-slate-900" : "text-white")}>
            Most Active Properties
          </h3>
          <p className="text-[11px] text-muted-foreground font-medium">Ranked by request volume & maintenance concentration</p>
        </div>
        <Activity className="w-4 h-4 text-indigo-500" />
      </div>

      {/* Property Ranking List */}
      <div className="space-y-2.5">
        {properties.map((prop) => (
          <div
            key={prop.id}
            onClick={() => onSelectProperty && onSelectProperty(prop)}
            className={cn(
              "p-3.5 rounded-2xl border cursor-pointer space-y-2 backdrop-blur-xl transition-all hover:scale-[1.02]",
              theme === 'light'
                ? "bg-slate-50/80 border-slate-200 hover:border-indigo-400/50"
                : "bg-slate-950/80 border-white/5 hover:border-white/20"
            )}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className={cn("text-xs font-black truncate", theme === 'light' ? "text-slate-900" : "text-white")}>
                  {prop.name}
                </h4>
                <p className="text-[10px] text-muted-foreground font-medium">📍 {prop.city} · ID: {prop.propertyId}</p>
              </div>

              <div className="flex items-center gap-1 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 text-xs font-black text-rose-500">
                <span>{prop.activeRequestsCount} Req</span>
              </div>
            </div>

            {/* Micro Metrics & Recurring Alert */}
            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground pt-1 border-t border-border/40">
              <span className="text-rose-500">{prop.open} Open</span>
              <span>·</span>
              <span className="text-indigo-500">{prop.avgResolutionHours}h Avg Res</span>
              <span>·</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full font-black",
                prop.healthScore < 80 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
              )}>
                Health {prop.healthScore}/100
              </span>
            </div>

            {/* Contextual Intelligence Alert */}
            {prop.recurringAlert && (
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-500 font-bold flex items-center gap-1.5 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{prop.recurringAlert}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
