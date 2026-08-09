import React from 'react';
import { Calendar as CalendarIcon, Clock, UserCheck, ArrowRight, Wrench } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function TenantUpcomingMaintenance({ requests = [], onSelectTicket, theme }) {
  // Filter scheduled visits
  const upcomingVisits = requests.filter((r) =>
    ['visit_scheduled', 'scheduled', 'technician_assigned', 'in_progress'].includes(r.status) || r.requestedVisitDate
  );

  return (
    <div className={cn(
      "p-6 rounded-[2.25rem] border shadow-2xl space-y-4 backdrop-blur-2xl transition-all flex flex-col justify-between",
      theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
    )}>
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-sky-400" />
          <h3 className="text-base font-black tracking-tight">Upcoming Visits & Repairs</h3>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
          {upcomingVisits.length} Scheduled
        </span>
      </div>

      {upcomingVisits.length === 0 ? (
        <div className="p-8 border border-dashed rounded-3xl text-center space-y-1 text-muted-foreground">
          <Wrench className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-xs font-bold">No upcoming visits scheduled</p>
          <p className="text-[10px]">Submitted requests will appear here once scheduled.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-none">
          {upcomingVisits.map((v) => {
            const dt = v.requestedVisitDate || v.scheduledDate || v.createdAt;
            const formattedDate = dt ? new Date(dt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date N/A';

            return (
              <div
                key={v._id}
                className={cn(
                  "p-4 rounded-2xl border transition-all space-y-2 hover:scale-[1.01]",
                  theme === 'light' ? "bg-slate-100/80 border-slate-200" : "bg-slate-900/50 border-white/10"
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-black text-foreground tracking-tight">{v.title}</h4>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                      📍 {v.property?.name || 'Assigned Residence'} · Unit {v.unit || 'N/A'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {v.status?.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span className="font-mono font-bold text-foreground text-[11px]">{formattedDate} ({v.requestedTimeSlot || 'Morning'})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-bold text-foreground text-[11px]">
                      Tech: {v.assignedTo ? `${v.assignedTo.firstName || ''} ${v.assignedTo.lastName || ''}`.trim() : 'Assigned Soon'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectTicket && onSelectTicket(v)}
                  className="w-full py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 font-extrabold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer mt-1"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
