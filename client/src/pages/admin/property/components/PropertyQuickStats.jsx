import React from 'react';
import { IndianRupee, Users, Wrench, ShieldCheck, Clock, FileText, Star } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function PropertyQuickStats({ property, theme }) {
  if (!property) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      <div className={cn(
        "p-3.5 rounded-3xl border space-y-1 backdrop-blur-xl shadow-lg transition-all hover:scale-105",
        theme === 'light' ? "bg-white/80 border-slate-200" : "bg-[#0c0d15]/80 border-white/10"
      )}>
        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Monthly Rent</span>
        <p className="text-sm font-black text-emerald-500">₹{property.price?.toLocaleString()}</p>
      </div>

      <div className={cn(
        "p-3.5 rounded-3xl border space-y-1 backdrop-blur-xl shadow-lg transition-all hover:scale-105",
        theme === 'light' ? "bg-white/80 border-slate-200" : "bg-[#0c0d15]/80 border-white/10"
      )}>
        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Deposit</span>
        <p className={cn("text-sm font-black", theme === 'light' ? "text-slate-900" : "text-white")}>₹{property.deposit?.toLocaleString()}</p>
      </div>

      <div className={cn(
        "p-3.5 rounded-3xl border space-y-1 backdrop-blur-xl shadow-lg transition-all hover:scale-105",
        theme === 'light' ? "bg-white/80 border-slate-200" : "bg-[#0c0d15]/80 border-white/10"
      )}>
        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Occupancy %</span>
        <p className="text-sm font-black text-indigo-500">{property.occupancyRate}%</p>
      </div>

      <div className={cn(
        "p-3.5 rounded-3xl border space-y-1 backdrop-blur-xl shadow-lg transition-all hover:scale-105",
        theme === 'light' ? "bg-white/80 border-slate-200" : "bg-[#0c0d15]/80 border-white/10"
      )}>
        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Current Tenant</span>
        <p className={cn("text-xs font-black truncate", theme === 'light' ? "text-slate-900" : "text-white")}>
          {property.currentTenant?.name || 'Vacant'}
        </p>
      </div>

      <div className={cn(
        "p-3.5 rounded-3xl border space-y-1 backdrop-blur-xl shadow-lg transition-all hover:scale-105",
        theme === 'light' ? "bg-white/80 border-slate-200" : "bg-[#0c0d15]/80 border-white/10"
      )}>
        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Open Tickets</span>
        <p className="text-sm font-black text-amber-500">{property.openMaintenanceTickets}</p>
      </div>

      <div className={cn(
        "p-3.5 rounded-3xl border space-y-1 backdrop-blur-xl shadow-lg transition-all hover:scale-105",
        theme === 'light' ? "bg-white/80 border-slate-200" : "bg-[#0c0d15]/80 border-white/10"
      )}>
        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Maintenance</span>
        <p className="text-xs font-black text-muted-foreground">₹{property.annualMaintenanceCost?.toLocaleString()}</p>
      </div>

      <div className={cn(
        "p-3.5 rounded-3xl border space-y-1 backdrop-blur-xl shadow-lg transition-all hover:scale-105",
        theme === 'light' ? "bg-white/80 border-slate-200" : "bg-[#0c0d15]/80 border-white/10"
      )}>
        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Total Leases</span>
        <p className={cn("text-sm font-black", theme === 'light' ? "text-slate-900" : "text-white")}>{property.totalLeasesCount}</p>
      </div>

      <div className={cn(
        "p-3.5 rounded-3xl border space-y-1 backdrop-blur-xl shadow-lg transition-all hover:scale-105",
        theme === 'light' ? "bg-white/80 border-slate-200" : "bg-[#0c0d15]/80 border-white/10"
      )}>
        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Manager Rating</span>
        <p className="text-xs font-black text-amber-400 flex items-center gap-1">
          <Star className="w-3 h-3 fill-current" /> {property.manager?.rating}
        </p>
      </div>
    </div>
  );
}
