import React from 'react';
import { Building, ShieldCheck, ArrowRight, Activity, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../../utils/cn';

export default function TenantSpatialCard({ tenant, onInspect, theme }) {
  const navigate = useNavigate();

  return (
    <div className={cn(
      "p-5 rounded-[2rem] border shadow-xl space-y-4 backdrop-blur-2xl transition-all hover:scale-[1.02] flex flex-col justify-between",
      theme === 'light'
        ? "bg-white/80 border-slate-200/80 shadow-slate-200/50 text-slate-900"
        : "bg-[#0c0d15]/80 border-white/10 shadow-black/60 text-white"
    )}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center text-sm shadow-md">
            {tenant.avatar || 'TS'}
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight">{tenant.name}</h3>
            <p className="text-[10px] text-muted-foreground font-mono font-bold">Tenant ID: {tenant.id}</p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          ● Active
        </span>
      </div>

      {/* Property & Location */}
      <div className="space-y-1 text-xs">
        <p className="font-extrabold flex items-center gap-1.5 text-indigo-400">
          <Building className="w-3.5 h-3.5" /> {tenant.propertyName}
        </p>
        <p className="text-[11px] text-muted-foreground font-medium">📍 {tenant.city} · {tenant.unit}</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/40">
        <div>
          <span className="text-[9px] text-muted-foreground font-bold block">Lease Standing</span>
          <p className="font-extrabold text-emerald-400 text-[11px]">{tenant.leaseMonthsRemaining} mos remaining</p>
        </div>
        <div>
          <span className="text-[9px] text-muted-foreground font-bold block">Open Maintenance</span>
          <p className="font-extrabold text-rose-500 text-[11px]">{tenant.openMaintenanceCount} open requests</p>
        </div>
      </div>

      {/* Actions (NO EDIT/DELETE) */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => onInspect && onInspect(tenant)}
          className={cn(
            "flex-1 py-2 rounded-full text-xs font-black transition-all border cursor-pointer",
            theme === 'light' ? "bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200" : "bg-slate-900 border-white/10 text-slate-200 hover:bg-slate-800"
          )}
        >
          Quick Inspect
        </button>
        <button
          onClick={() => navigate(`/admin/people/tenants/${tenant.id}`)}
          className="flex-1 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
        >
          View Profile <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
