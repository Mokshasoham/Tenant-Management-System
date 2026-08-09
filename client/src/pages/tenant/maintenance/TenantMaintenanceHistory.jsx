import React from 'react';
import { History, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function TenantMaintenanceHistory({ requests = [], onSelectTicket, theme }) {
  // Resolved or Closed requests
  const historyRequests = requests.filter(r => ['resolved', 'completed', 'closed'].includes(r.status));

  return (
    <div className={cn(
      "p-6 rounded-[2.25rem] border shadow-2xl space-y-4 backdrop-blur-2xl transition-all",
      theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
    )}>
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-black tracking-tight">Maintenance History & Past Tickets</h3>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {historyRequests.length} Resolved
        </span>
      </div>

      {historyRequests.length === 0 ? (
        <div className="p-8 border border-dashed rounded-3xl text-center space-y-1 text-muted-foreground">
          <History className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-xs font-bold">No maintenance history records yet</p>
          <p className="text-[10px]">Completed maintenance requests will be archived here.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-none">
          {historyRequests.map((r) => {
            const dt = r.updatedAt || r.createdAt ? new Date(r.updatedAt || r.createdAt).toLocaleDateString() : 'N/A';

            return (
              <div
                key={r._id}
                className={cn(
                  "p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:scale-[1.005]",
                  theme === 'light' ? "bg-slate-100/70 border-slate-200" : "bg-slate-900/40 border-white/5"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h4 className="text-sm font-black text-foreground">{r.title}</h4>
                    <span className="text-[10px] font-mono font-bold text-muted-foreground">({r.ticketNumber || r._id})</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    Category: <span className="capitalize font-bold text-foreground">{r.category || 'General'}</span> · Resolved on {dt}
                  </p>
                </div>

                <button
                  onClick={() => onSelectTicket && onSelectTicket(r)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer self-start sm:self-center"
                >
                  Inspect Ticket <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
