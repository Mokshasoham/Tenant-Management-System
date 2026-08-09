import React from 'react';
import { Building, UserCheck, Users, Wrench, AlertTriangle, ArrowRight, GitFork } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function PropertyRelationshipGraph({ onInspectPerson, theme }) {
  return (
    <div className={cn(
      "h-[420px] w-full rounded-[2.25rem] border shadow-2xl p-6 flex flex-col justify-between relative transition-all backdrop-blur-2xl overflow-hidden",
      theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
    )}>
      {/* Header */}
      <div className="flex justify-between items-center z-10">
        <div>
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest">
            UNIVERSAL RELATIONSHIP GRAPH
          </span>
          <h3 className={cn("text-base font-black tracking-tight mt-1", theme === 'light' ? "text-slate-900" : "text-white")}>
            Property Network Ecosystem Mapping
          </h3>
        </div>
        <GitFork className="w-5 h-5 text-indigo-500" />
      </div>

      {/* Visual Relationship Graph Hierarchy */}
      <div className="flex-1 my-3 flex items-center justify-center relative overflow-x-auto py-4">
        <div className="flex items-center gap-6 min-w-max">
          {/* Node 1: PROPERTY */}
          <div className="p-4 rounded-3xl bg-indigo-600/20 border border-indigo-500/40 text-center space-y-1 shadow-xl">
            <Building className="w-6 h-6 text-indigo-400 mx-auto" />
            <h4 className="text-xs font-black text-indigo-400">PROPERTY</h4>
            <p className="text-[10px] text-white font-bold">Ocean Pearl Residency</p>
          </div>

          <ArrowRight className="w-4 h-4 text-indigo-500 flex-shrink-0" />

          {/* Node 2: MANAGER */}
          <div
            onClick={() => onInspectPerson && onInspectPerson({ name: 'Alex Mercer', role: 'manager', email: 'alex.mercer@apexmgmt.com', status: 'active', trustScore: 94, managedPropertiesCount: 12 })}
            className="p-4 rounded-3xl bg-purple-600/20 border border-purple-500/40 text-center space-y-1 shadow-xl cursor-pointer hover:scale-105 transition-all"
          >
            <UserCheck className="w-6 h-6 text-purple-400 mx-auto" />
            <h4 className="text-xs font-black text-purple-400">MANAGER</h4>
            <p className="text-[10px] text-white font-bold">Alex Mercer</p>
          </div>

          <ArrowRight className="w-4 h-4 text-purple-500 flex-shrink-0" />

          {/* Node 3: TENANTS */}
          <div className="flex flex-col gap-2">
            <div
              onClick={() => onInspectPerson && onInspectPerson({ name: 'Mokshagna Soham', role: 'tenant', email: 'mokshasoham3@gmail.com', status: 'active', trustScore: 91, propertyName: 'Ocean Pearl Residency', unit: 'Unit 4B' })}
              className="p-3 rounded-2xl bg-sky-600/20 border border-sky-500/40 text-center space-y-0.5 shadow-md cursor-pointer hover:scale-105 transition-all"
            >
              <Users className="w-4 h-4 text-sky-400 mx-auto" />
              <p className="text-[10px] text-white font-black">Mokshagna Soham</p>
              <span className="text-[9px] text-muted-foreground">Tenant · Unit 4B</span>
            </div>

            <div
              onClick={() => onInspectPerson && onInspectPerson({ name: 'Swaraj Vecha', role: 'tenant', email: 'swarajvecha@gmail.com', status: 'active', trustScore: 95, propertyName: 'Ocean Pearl Residency', unit: 'Unit 19' })}
              className="p-3 rounded-2xl bg-sky-600/20 border border-sky-500/40 text-center space-y-0.5 shadow-md cursor-pointer hover:scale-105 transition-all"
            >
              <Users className="w-4 h-4 text-sky-400 mx-auto" />
              <p className="text-[10px] text-white font-black">Swaraj Vecha</p>
              <span className="text-[9px] text-muted-foreground">Tenant · Unit 19</span>
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-sky-500 flex-shrink-0" />

          {/* Node 4: TECHNICIAN */}
          <div
            onClick={() => onInspectPerson && onInspectPerson({ name: 'Ravi Kumar', role: 'technician', email: 'ravi.tech@tms.com', status: 'on_job', specialty: 'Plumbing', rating: 4.8 })}
            className="p-4 rounded-3xl bg-emerald-600/20 border border-emerald-500/40 text-center space-y-1 shadow-xl cursor-pointer hover:scale-105 transition-all"
          >
            <Wrench className="w-6 h-6 text-emerald-400 mx-auto" />
            <h4 className="text-xs font-black text-emerald-400">TECHNICIAN</h4>
            <p className="text-[10px] text-white font-bold">Ravi Kumar</p>
          </div>

          <ArrowRight className="w-4 h-4 text-emerald-500 flex-shrink-0" />

          {/* Node 5: MAINTENANCE REQUEST */}
          <div className="p-4 rounded-3xl bg-rose-600/20 border border-rose-500/40 text-center space-y-1 shadow-xl">
            <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
            <h4 className="text-xs font-black text-rose-400">MAINTENANCE</h4>
            <p className="text-[10px] text-white font-bold">REQ-2026-0842</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-[10px] font-bold text-muted-foreground pt-2 border-t border-border/40 text-center">
        Click any node in the relationship network graph to launch its spatial inspection workspace
      </div>
    </div>
  );
}
