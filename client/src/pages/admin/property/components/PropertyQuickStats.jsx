import React from 'react';
import { IndianRupee, Users, Wrench, ShieldCheck, Clock, FileText } from 'lucide-react';

export default function PropertyQuickStats({ property }) {
  if (!property) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
        <span className="text-[10px] text-slate-400 block font-medium">Monthly Rent</span>
        <p className="text-sm font-extrabold font-mono text-emerald-400">₹{property.price?.toLocaleString()}</p>
      </div>

      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
        <span className="text-[10px] text-slate-400 block font-medium">Deposit</span>
        <p className="text-sm font-extrabold font-mono text-slate-200">₹{property.deposit?.toLocaleString()}</p>
      </div>

      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
        <span className="text-[10px] text-slate-400 block font-medium">Occupancy %</span>
        <p className="text-sm font-extrabold text-indigo-400">{property.occupancyRate}%</p>
      </div>

      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
        <span className="text-[10px] text-slate-400 block font-medium">Current Tenant</span>
        <p className="text-xs font-bold text-slate-200 truncate">{property.currentTenant?.name || 'Vacant'}</p>
      </div>

      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
        <span className="text-[10px] text-slate-400 block font-medium">Open Tickets</span>
        <p className="text-sm font-extrabold text-amber-400">{property.openMaintenanceTickets}</p>
      </div>

      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
        <span className="text-[10px] text-slate-400 block font-medium">Maintenance</span>
        <p className="text-xs font-mono font-bold text-slate-300">₹{property.annualMaintenanceCost?.toLocaleString()}</p>
      </div>

      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
        <span className="text-[10px] text-slate-400 block font-medium">Total Leases</span>
        <p className="text-sm font-extrabold text-white">{property.totalLeasesCount}</p>
      </div>

      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
        <span className="text-[10px] text-slate-400 block font-medium">Manager Rating</span>
        <p className="text-xs font-bold text-amber-400">{property.manager?.rating} ★</p>
      </div>
    </div>
  );
}
