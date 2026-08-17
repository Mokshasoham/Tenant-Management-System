import React from 'react';
import { motion } from 'framer-motion';
import { Wrench, Clock, AlertTriangle, FileText, UserCheck, CheckCircle2, ArrowRight, Activity } from 'lucide-react';
import { cn } from '../../../utils/cn';

const STAGE_CONFIG = [
  { num: 1, key: 'submitted', label: 'Submitted', icon: FileText },
  { num: 2, key: 'assigned', label: 'Assigned', icon: UserCheck },
  { num: 3, key: 'in_work', label: 'In Work', icon: Wrench },
  { num: 4, key: 'resolved', label: 'Resolved', icon: CheckCircle2 },
];

function getStageProgress(status) {
  const map = {
    open: { stage: 1, pct: 25 },
    submitted: { stage: 1, pct: 25 },
    manager_review: { stage: 1, pct: 30 },
    technician_assigned: { stage: 2, pct: 50 },
    visit_scheduled: { stage: 2, pct: 55 },
    technician_en_route: { stage: 3, pct: 70 },
    work_started: { stage: 3, pct: 80 },
    in_progress: { stage: 3, pct: 85 },
    completed: { stage: 4, pct: 100 },
    resolved: { stage: 4, pct: 100 },
    closed: { stage: 4, pct: 100 },
  };
  return map[status] || { stage: 1, pct: 25 };
}

export default function TenantMaintenanceRequests({ requests = [], onSelectTicket, theme }) {
  // Active requests (not resolved or closed)
  const activeRequests = requests.filter(r => !['resolved', 'completed', 'closed', 'cancelled'].includes(r.status));

  return (
    <div className={cn(
      "p-6 rounded-[2.25rem] border shadow-2xl space-y-4 backdrop-blur-2xl transition-all",
      theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
    )}>
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-500 animate-spin" />
          <h3 className="text-base font-black tracking-tight">My Active Maintenance Requests</h3>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          {activeRequests.length} Active
        </span>
      </div>

      {activeRequests.length === 0 ? (
        <div className="p-8 border border-dashed rounded-3xl text-center space-y-1 text-muted-foreground">
          <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500/50 mb-2" />
          <p className="text-xs font-bold">No active maintenance tickets</p>
          <p className="text-[10px]">All your submitted requests have been resolved.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeRequests.map((req) => {
            const { stage, pct } = getStageProgress(req.status);
            const dt = req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Recent';

            return (
              <div
                key={req._id}
                className={cn(
                  "p-5 rounded-3xl border shadow-lg transition-all space-y-4 hover:scale-[1.01] flex flex-col justify-between",
                  theme === 'light' ? "bg-slate-100/80 border-slate-200 text-slate-900" : "bg-slate-900/60 border-white/10 text-white"
                )}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="text-sm font-black tracking-tight">{req.title}</h4>
                      <p className="text-[10px] text-muted-foreground font-mono font-bold mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>ID: {req.ticketNumber || req._id} · {dt}</span>
                        {req.property?.name && (
                          <span className="text-amber-400 font-sans font-bold">
                            • 🏠 {req.property.name}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {req.priority || 'Medium'} Priority
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">{req.description}</p>
                </div>

                {/* Animated Status Tracker Line */}
                <div className="space-y-2 py-2 px-3 rounded-2xl bg-slate-950/40 border border-white/5">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-muted-foreground uppercase text-[9px]">Lifecycle Tracker</span>
                    <span className="font-mono text-amber-400">{pct}% Progress</span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1 pt-1 text-center text-[9px] font-bold text-muted-foreground">
                    {STAGE_CONFIG.map((st) => (
                      <span key={st.num} className={stage >= st.num ? 'text-amber-400 font-black' : ''}>
                        {st.label}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => onSelectTicket && onSelectTicket(req)}
                  className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  View Live Status <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
