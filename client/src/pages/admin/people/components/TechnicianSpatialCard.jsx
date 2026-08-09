import React from 'react';
import { Wrench, Star, Clock, ArrowRight, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../../utils/cn';

export default function TechnicianSpatialCard({ technician, onInspect, theme }) {
  const navigate = useNavigate();

  return (
    <div className={cn(
      "p-5 rounded-[2rem] border shadow-xl space-y-4 backdrop-blur-2xl transition-all hover:scale-[1.02] flex flex-col justify-between",
      theme === 'light'
        ? "bg-white/80 border-slate-200/80 shadow-slate-200/50 text-slate-900"
        : "bg-[#0c0d15]/80 border-white/10 shadow-black/60 text-white"
    )}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black flex items-center justify-center text-sm shadow-md">
            🔧
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight">{technician.name}</h3>
            <p className="text-[10px] text-emerald-400 font-bold">{technician.specialty}</p>
          </div>
        </div>

        <span className={cn(
          "px-2.5 py-1 rounded-full text-[10px] font-black border",
          technician.dispatchStatus === 'ON_JOB'
            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        )}>
          {technician.dispatchStatus === 'ON_JOB' ? '● On Job' : '● Available'}
        </span>
      </div>

      <div className="space-y-1 text-xs">
        <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-indigo-400" /> {technician.currentLocation}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-center pt-1 border-t border-border/40">
        <div>
          <span className="text-[9px] text-muted-foreground font-bold block">Jobs Done</span>
          <p className="font-mono font-black text-indigo-400 text-xs">{technician.jobsCompleted !== undefined ? technician.jobsCompleted : '0'}</p>
        </div>
        <div>
          <span className="text-[9px] text-muted-foreground font-bold block">On Time</span>
          <p className="font-mono font-black text-emerald-400 text-xs">{technician.onTimePercent ? `${technician.onTimePercent}%` : 'N/A'}</p>
        </div>
        <div>
          <span className="text-[9px] text-muted-foreground font-bold block">Avg Speed</span>
          <p className="font-mono font-black text-slate-300 text-xs">{technician.avgResolutionHours ? `${technician.avgResolutionHours}h` : 'N/A'}</p>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => onInspect && onInspect(technician)}
          className={cn(
            "flex-1 py-2 rounded-full text-xs font-black transition-all border cursor-pointer",
            theme === 'light' ? "bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200" : "bg-slate-900 border-white/10 text-slate-200 hover:bg-slate-800"
          )}
        >
          Quick Inspect
        </button>
        <button
          onClick={() => navigate(`/admin/people/technicians/${technician.id}`)}
          className="flex-1 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
        >
          View Profile <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
