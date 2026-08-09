import React, { useState } from 'react';
import { Wrench, UserCheck, ArrowRight, AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function ManagerMaintenanceQueue({
  requests = [],
  onOpenAssignModal,
  onOpenDetailsDrawer,
  theme,
}) {
  const [filterTab, setFilterTab] = useState('all');

  const filteredRequests = requests.filter((r) => {
    if (filterTab === 'open') return ['open', 'submitted'].includes(r.status);
    if (filterTab === 'assigned') return r.status === 'technician_assigned' || r.assignedTo;
    if (filterTab === 'in_progress') return ['in_progress', 'work_started', 'technician_en_route'].includes(r.status);
    if (filterTab === 'scheduled') return ['visit_scheduled', 'scheduled'].includes(r.status) || r.requestedVisitDate;
    if (filterTab === 'resolved') return ['resolved', 'completed', 'closed'].includes(r.status);
    if (filterTab === 'sla_risk') return r.priority === 'emergency' || r.priority === 'high';
    return true;
  });

  return (
    <div className={cn(
      "p-6 rounded-[2.25rem] border shadow-2xl space-y-4 backdrop-blur-2xl transition-all",
      theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-black tracking-tight">Maintenance Request Queue</h3>
        </div>

        {/* Queue Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All' },
            { id: 'open', label: 'Open' },
            { id: 'assigned', label: 'Assigned' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'scheduled', label: 'Scheduled' },
            { id: 'resolved', label: 'Resolved' },
            { id: 'sla_risk', label: 'SLA Risk' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                filterTab === tab.id
                  ? "bg-purple-600 text-white shadow-md font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="p-8 border border-dashed rounded-3xl text-center space-y-1 text-muted-foreground">
          <Wrench className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-xs font-bold">No maintenance requests found</p>
          <p className="text-[10px]">No tickets match the selected operational filter.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-none">
          {filteredRequests.map((req) => {
            const dt = req.createdAt ? new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
            const techName = req.assignedTo ? `${req.assignedTo.firstName || ''} ${req.assignedTo.lastName || ''}`.trim() : 'Unassigned';

            return (
              <div
                key={req._id}
                className={cn(
                  "p-4 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:scale-[1.005]",
                  theme === 'light' ? "bg-slate-100/80 border-slate-200 text-slate-900" : "bg-slate-900/60 border-white/10 text-white"
                )}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-purple-400">
                      {req.ticketNumber || req._id}
                    </span>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                      req.priority === 'emergency' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                      {req.priority || 'Medium'}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-foreground">{req.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    📍 {req.property?.name || 'Assigned Property'} · Unit {req.unit || 'N/A'} · Submitted {dt}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="text-xs text-left sm:text-right">
                    <span className="text-[9px] font-black text-muted-foreground uppercase block">Technician</span>
                    <p className={cn("font-bold text-xs", req.assignedTo ? "text-purple-400" : "text-amber-500")}>
                      {techName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenAssignModal && onOpenAssignModal(req)}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Assign Tech
                    </button>
                    <button
                      onClick={() => onOpenDetailsDrawer && onOpenDetailsDrawer(req)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                    >
                      Open Request →
                    </button>
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
