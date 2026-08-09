import React from 'react';
import { Clock, AlertTriangle, ArrowRight, UserCheck, Wrench, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function MaintenanceRequestStream({ requests = [], onOpenRequest, theme }) {
  const getStatusBadge = (status) => {
    if (status === 'open' || status === 'submitted') {
      return { label: 'Open', class: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
    }
    if (status === 'in_progress' || status === 'technician_assigned') {
      return { label: 'In Progress', class: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
    }
    return { label: 'Resolved', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
  };

  return (
    <div className={cn(
      "p-6 rounded-[2.25rem] border shadow-2xl space-y-5 backdrop-blur-2xl transition-all",
      theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
    )}>
      <div className="flex justify-between items-center pb-3 border-b border-border/50">
        <div>
          <h3 className={cn("text-base font-black tracking-tight", theme === 'light' ? "text-slate-900" : "text-white")}>
            Maintenance Request Stream
          </h3>
          <p className="text-xs text-muted-foreground font-medium">Real-time property maintenance events across portfolio</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-xs font-black">
          {requests.length} Stream Events
        </span>
      </div>

      {/* Stream Items */}
      <div className="space-y-3">
        {requests.map((req) => {
          const badge = getStatusBadge(req.status);
          return (
            <div
              key={req.id}
              onClick={() => onOpenRequest && onOpenRequest(req)}
              className={cn(
                "p-4 rounded-2xl border cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:scale-[1.01] shadow-lg",
                theme === 'light'
                  ? "bg-slate-50/80 border-slate-200 hover:border-indigo-400/50"
                  : "bg-slate-950/80 border-white/5 hover:border-white/20"
              )}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono font-black text-xs border border-indigo-500/20 flex-shrink-0">
                  ● {req.timestamp}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={cn("text-xs font-black truncate", theme === 'light' ? "text-slate-900" : "text-white")}>
                      {req.title}
                    </h4>
                    <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black border", badge.class)}>
                      {badge.label}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      ID: {req.id}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-2 truncate">
                    <span className="text-slate-300 font-bold">{req.propertyName}</span>
                    <span>·</span>
                    <span>{req.unit}</span>
                    <span>·</span>
                    <span>{req.submittedBy}</span>
                  </p>
                </div>
              </div>

              {/* Right Info & CTA */}
              <div className="flex items-center justify-between md:justify-end gap-4 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
                <div className="text-right text-xs">
                  <p className="font-black text-emerald-500">₹{req.estimatedCost?.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Tech: {req.assignedTechnician?.name || 'Unassigned'}</p>
                </div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onOpenRequest && onOpenRequest(req); }}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-105",
                    theme === 'light' ? "bg-slate-950 text-white hover:bg-indigo-600" : "bg-white text-slate-950 hover:bg-slate-200"
                  )}
                >
                  Inspect <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
