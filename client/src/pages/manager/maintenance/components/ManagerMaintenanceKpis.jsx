import React from 'react';
import { AlertTriangle, Clock, Calendar as CalendarIcon, ShieldAlert, UserCheck } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function ManagerMaintenanceKpis({ requests = [], technicians = [], theme }) {
  const openCount = requests.filter(r => ['open', 'submitted', 'manager_review'].includes(r.status)).length;
  const inProgressCount = requests.filter(r => ['in_progress', 'technician_assigned', 'technician_en_route', 'work_started', 'waiting_parts'].includes(r.status)).length;
  const scheduledCount = requests.filter(r => ['visit_scheduled', 'scheduled'].includes(r.status) || r.requestedVisitDate || r.scheduledDate).length;
  const slaRiskCount = requests.filter(r => (r.priority === 'emergency' || r.priority === 'high') && ['open', 'submitted'].includes(r.status)).length;
  const availableTechsCount = technicians.filter(t => t.isActive !== false).length;

  const kpis = [
    { label: 'OPEN', count: openCount, color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20', icon: AlertTriangle, sub: 'Needs Assignment' },
    { label: 'IN PROGRESS', count: inProgressCount, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock, sub: 'Active Dispatches' },
    { label: 'SCHEDULED', count: scheduledCount, color: 'text-sky-500', bg: 'bg-sky-500/10 border-sky-500/20', icon: CalendarIcon, sub: 'Confirmed Visits' },
    { label: 'SLA RISK', count: slaRiskCount, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: ShieldAlert, sub: 'High Urgency' },
    { label: 'AVAILABLE TECHS', count: availableTechsCount, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: UserCheck, sub: 'Field Workforce' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div
            key={idx}
            className={cn(
              "p-4 rounded-3xl border shadow-xl backdrop-blur-2xl transition-all flex flex-col justify-between space-y-2 hover:scale-[1.01]",
              theme === 'light'
                ? "bg-white/80 border-slate-200/80 shadow-slate-200/50"
                : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </span>
              <div className={cn("p-2 rounded-xl border", kpi.bg)}>
                <Icon className={cn("w-4 h-4", kpi.color)} />
              </div>
            </div>
            <div>
              <p className={cn("text-2xl sm:text-3xl font-mono font-black tracking-tight", kpi.color)}>
                {kpi.count}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{kpi.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
