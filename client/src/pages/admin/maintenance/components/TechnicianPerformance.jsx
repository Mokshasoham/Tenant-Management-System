import React from 'react';
import { UserCheck, Star, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function TechnicianPerformance({ technicians = [], theme }) {
  return (
    <div className={cn(
      "p-5 rounded-[2rem] border shadow-2xl space-y-4 backdrop-blur-2xl transition-all",
      theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
    )}>
      <div className="flex justify-between items-center">
        <div>
          <h3 className={cn("text-sm font-black tracking-tight", theme === 'light' ? "text-slate-900" : "text-white")}>
            Technician Performance
          </h3>
          <p className="text-[11px] text-muted-foreground font-medium">Workforce efficiency, rating & resolution times</p>
        </div>
        <UserCheck className="w-4 h-4 text-indigo-500" />
      </div>

      <div className="space-y-2.5">
        {technicians.map((tech) => (
          <div
            key={tech.id}
            className={cn(
              "p-3 rounded-2xl border space-y-1.5 backdrop-blur-xl transition-all",
              theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-white/5"
            )}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-black truncate">{tech.name}</span>
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> {tech.rating}
              </span>
            </div>

            <div className="flex justify-between text-[10px] font-bold text-muted-foreground pt-1 border-t border-border/40">
              <span className="text-indigo-400">{tech.jobsCompleted} Jobs</span>
              <span>·</span>
              <span className="text-emerald-400">{tech.onTimePercent}% On Time</span>
              <span>·</span>
              <span className="text-slate-300">{tech.avgResolutionHours}h Avg Res</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
