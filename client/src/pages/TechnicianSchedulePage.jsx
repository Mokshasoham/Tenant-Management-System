import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, CheckCircle2, MapPin, ArrowRight } from 'lucide-react';
import { useTechnicianJobs } from '../hooks/useTechnicianJobs';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../utils/cn';

export default function TechnicianSchedulePage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { jobs, loading } = useTechnicianJobs();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 transition-colors duration-300">
      <div>
        <h1 className="text-xl font-black text-foreground flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-cyan-500" />
          My Dispatch & Shift Schedule
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5 font-medium">
          View your assigned shifts, operating hours, and scheduled maintenance visits
        </p>
      </div>

      <div className={cn(
        "rounded-3xl border p-6 backdrop-blur-xl space-y-6 shadow-xl transition-all",
        theme === 'light' ? "bg-white border-slate-200 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
      )}>
        {/* Shift Banner */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
          <Clock className="w-5 h-5 text-cyan-500 shrink-0" />
          <div>
            <h3 className="text-sm font-black text-foreground">Standard Shift: 09:00 - 17:00 (Mon - Fri)</h3>
            <p className="text-xs text-muted-foreground font-medium">Territory: Main Property Network</p>
          </div>
        </div>

        {/* Assigned Jobs Timeline */}
        <div className="space-y-4">
          <h2 className="text-sm font-black text-foreground flex items-center justify-between border-b border-border/40 pb-2">
            <span>Today's Dispatch Calendar</span>
            <span className="text-xs font-mono text-cyan-500 font-bold">{jobs.length} Assigned Jobs</span>
          </h2>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground text-xs font-bold">Loading scheduled visits...</div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs font-bold border border-dashed border-border/60 rounded-2xl">
              No scheduling conflicts detected for today.
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job, idx) => (
                <div
                  key={job._id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all hover:scale-[1.005]",
                    theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-white/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 text-xs font-mono font-black shrink-0">
                      {`0${9 + (idx % 8)}:00 AM`}
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-black text-foreground">{job.title}</h3>
                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-cyan-500" />
                        {job.property?.name || 'Property'} • Unit {job.unit || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/technician/jobs/${job._id}`)}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer shrink-0"
                  >
                    View Job <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
