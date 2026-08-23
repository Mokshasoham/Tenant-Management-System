import React from 'react';
import { UserCheck, Wrench, Clock, ShieldCheck } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function ManagerTechnicianWorkload({ technicians = [], requests = [], theme }) {
  return (
    <div className={cn(
      "p-6 rounded-[2.25rem] border shadow-2xl space-y-4 backdrop-blur-2xl transition-all",
      theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
    )}>
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-black tracking-tight">Field Workforce & Workload</h3>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {technicians.length} Technicians
        </span>
      </div>

      {technicians.length === 0 ? (
        <div className="p-8 border border-dashed rounded-3xl text-center space-y-1.5 text-muted-foreground">
          <UserCheck className="w-6 h-6 mx-auto text-muted-foreground/50 mb-1" />
          <p className="text-xs font-bold text-foreground">No technicians assigned to your manager account yet.</p>
          <p className="text-[10px] text-muted-foreground">Add or invite technicians to manage your maintenance workforce.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {technicians.map((tech) => {
            const techId = tech._id || tech.id;
            const assignedJobs = requests.filter(r => r.assignedTo?._id === techId || r.assignedTo === techId);
            const activeJobs = assignedJobs.filter(r => !['resolved', 'completed', 'closed'].includes(r.status));
            const statusLabel = activeJobs.length > 0 ? 'ON JOB' : 'AVAILABLE';

            return (
              <div
                key={techId}
                className={cn(
                  "p-4 rounded-3xl border transition-all space-y-3",
                  theme === 'light' ? "bg-slate-100/70 border-slate-200" : "bg-slate-900/40 border-white/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black flex items-center justify-center text-xs">
                      {tech.firstName?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-foreground">
                        {tech.firstName} {tech.lastName}
                      </h4>
                      <p className="text-[9px] text-muted-foreground font-medium">
                        {tech.technicianProfile?.skills?.[0]?.name || 'General Field Tech'}
                      </p>
                    </div>
                  </div>

                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                    statusLabel === 'ON JOB'
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  )}>
                    {statusLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
                  <div className="p-2 rounded-xl bg-slate-950/40 border border-white/5 space-y-0.5">
                    <span className="text-[8px] font-black uppercase text-muted-foreground block">Active Jobs</span>
                    <p className="font-mono font-extrabold text-emerald-400 text-sm">{activeJobs.length}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/40 border border-white/5 space-y-0.5">
                    <span className="text-[8px] font-black uppercase text-muted-foreground block">Total Assigned</span>
                    <p className="font-mono font-extrabold text-purple-400 text-sm">{assignedJobs.length}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
