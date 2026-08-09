import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wrench, Star, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { cn } from '../../../../utils/cn';
import { MOCK_TECHNICIANS } from '../../../../mocks/adminPeopleMock';

export default function AdminTechnicianProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const tech = MOCK_TECHNICIANS.find((t) => t.id === id) || MOCK_TECHNICIANS[0];

  return (
    <div className={cn(
      "min-h-screen p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans transition-colors",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#050508] text-slate-100"
    )}>
      <button
        onClick={() => navigate('/admin/people/technicians')}
        className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Technicians Directory
      </button>

      {/* Header Profile Workspace (NO EDIT/DELETE BUTTONS) */}
      <div className={cn(
        "p-6 rounded-[2.25rem] border shadow-2xl space-y-4 backdrop-blur-2xl transition-all",
        theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black flex items-center justify-center text-2xl shadow-lg">
              🔧
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{tech.name}</h1>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-black border",
                  tech.dispatchStatus === 'ON_JOB'
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                )}>
                  {tech.dispatchStatus === 'ON_JOB' ? '● On Job' : '● Available'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                Technician ID: {tech.id} · Specialty: {tech.specialty} · {tech.phone}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-muted-foreground font-bold block">Rating & Performance</span>
            <p className="font-mono font-black text-amber-400 text-base flex items-center justify-end gap-1">
              <Star className="w-4 h-4 fill-current" /> {tech.rating} Rating
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-3 border-t border-border/40">
          <div className={cn("p-3 rounded-2xl border space-y-0.5", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/5")}>
            <span className="text-[9px] text-muted-foreground font-bold block">Jobs Completed</span>
            <p className="font-mono font-black text-indigo-400 text-base">{tech.jobsCompleted}</p>
          </div>
          <div className={cn("p-3 rounded-2xl border space-y-0.5", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/5")}>
            <span className="text-[9px] text-muted-foreground font-bold block">On-Time %</span>
            <p className="font-mono font-black text-emerald-400 text-base">{tech.onTimePercent}%</p>
          </div>
          <div className={cn("p-3 rounded-2xl border space-y-0.5", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/5")}>
            <span className="text-[9px] text-muted-foreground font-bold block">Avg Resolution</span>
            <p className="font-mono font-black text-slate-300 text-base">{tech.avgResolutionHours}h</p>
          </div>
          <div className={cn("p-3 rounded-2xl border space-y-0.5", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/5")}>
            <span className="text-[9px] text-muted-foreground font-bold block">Current Location</span>
            <p className="font-bold text-emerald-400 text-xs truncate">{tech.currentLocation}</p>
          </div>
        </div>
      </div>

      {/* Certified Technical Skills */}
      <div className={cn(
        "p-6 rounded-[2.25rem] border shadow-2xl space-y-3 backdrop-blur-2xl",
        theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
      )}>
        <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Certified Skills & Competencies</h3>
        <div className="flex flex-wrap gap-2">
          {(tech.skills || []).map((sk, idx) => (
            <span key={idx} className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> {sk}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
