import React, { useState } from 'react';
import { History, CheckCircle2, ArrowRight, Star, Check } from 'lucide-react';
import { cn } from '../../../utils/cn';
import TechnicianFeedbackModal from '../../../components/maintenance/TechnicianFeedbackModal';

export default function TenantMaintenanceHistory({ requests = [], onSelectTicket, onRefresh, theme }) {
  const [selectedTicketForRating, setSelectedTicketForRating] = useState(null);

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
        <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1 scrollbar-none">
          {historyRequests.map((r) => {
            const dt = r.updatedAt || r.createdAt ? new Date(r.updatedAt || r.createdAt).toLocaleDateString() : 'N/A';
            const techName = r.assignedTo
              ? `${r.assignedTo.firstName || ''} ${r.assignedTo.lastName || ''}`.trim()
              : 'Assigned Specialist';
            const hasFeedback = Boolean(r.rating?.score || r.rating?.rating);
            const score = r.rating?.score || r.rating?.rating || 5;

            return (
              <div
                key={r._id}
                className={cn(
                  "p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:scale-[1.005]",
                  theme === 'light' ? "bg-slate-100/70 border-slate-200" : "bg-slate-900/40 border-white/5"
                )}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h4 className="text-sm font-black text-foreground truncate">{r.title}</h4>
                    <span className="text-[10px] font-mono font-bold text-muted-foreground">({r.ticketNumber || String(r._id).slice(-8)})</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      RESOLVED
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground pl-6">
                    {r.property?.name ? <span>🏠 <strong className="text-foreground">{r.property.name}</strong> · </span> : null}
                    Category: <span className="capitalize font-bold text-foreground">{r.category || 'General'}</span> · Resolved on {dt}
                  </p>

                  <p className="text-xs pl-6 font-medium text-slate-300">
                    Technician: <span className="font-bold text-indigo-400">{techName}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
                  <button
                    onClick={() => onSelectTicket && onSelectTicket(r)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Inspect Ticket <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {hasFeedback ? (
                    <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black flex items-center gap-1.5 shadow-sm">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>✓ Feedback Submitted</span>
                      <span className="flex items-center gap-0.5 ml-1 text-amber-300">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {score}/5
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedTicketForRating(r)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 fill-white text-white" />
                      Rate Technician
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Feedback Modal */}
      {selectedTicketForRating && (
        <TechnicianFeedbackModal
          ticket={selectedTicketForRating}
          onClose={() => setSelectedTicketForRating(null)}
          onSuccess={() => {
            setSelectedTicketForRating(null);
            if (onRefresh) onRefresh();
          }}
          theme={theme}
        />
      )}
    </div>
  );
}
