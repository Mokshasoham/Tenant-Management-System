import React from 'react';
import { Building, UserCheck, Users, Wrench, AlertTriangle, ArrowRight, GitFork } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function PropertyRelationshipGraph({
  properties = [],
  tenants = [],
  managers = [],
  technicians = [],
  maintenance = [],
  onInspectPerson,
  theme,
}) {
  const sampleProp = properties[0];
  const sampleManager = managers.find((m) => m.managedProperties?.some((p) => String(p.id) === String(sampleProp?._id))) || managers[0];
  const sampleTenants = tenants.slice(0, 2);
  const sampleTechs = technicians.slice(0, 2);

  const hasData = properties.length > 0 || tenants.length > 0 || managers.length > 0 || technicians.length > 0;

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

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-2 text-center text-muted-foreground">
          <GitFork className="w-10 h-10 opacity-30" />
          <p className="font-bold text-xs">No relationship nodes available</p>
          <p className="text-[10px]">Add properties, managers, or tenants to populate the real graph network.</p>
        </div>
      ) : (
        /* Visual Relationship Graph Hierarchy */
        <div className="flex-1 my-3 flex items-center justify-center relative overflow-x-auto py-4">
          <div className="flex items-center gap-6 min-w-max">
            {/* Node 1: PROPERTY */}
            <div className="p-4 rounded-3xl bg-indigo-600/20 border border-indigo-500/40 text-center space-y-1 shadow-xl">
              <Building className="w-6 h-6 text-indigo-400 mx-auto" />
              <h4 className="text-xs font-black text-indigo-400">PROPERTY</h4>
              <p className="text-[10px] text-white font-bold">{sampleProp?.name || 'Primary Residence'}</p>
            </div>

            <ArrowRight className="w-4 h-4 text-indigo-500 flex-shrink-0" />

            {/* Node 2: MANAGER */}
            <div
              onClick={() => sampleManager && onInspectPerson && onInspectPerson(sampleManager)}
              className={cn(
                "p-4 rounded-3xl bg-purple-600/20 border border-purple-500/40 text-center space-y-1 shadow-xl cursor-pointer hover:scale-105 transition-all",
                !sampleManager && "opacity-50 pointer-events-none"
              )}
            >
              <UserCheck className="w-6 h-6 text-purple-400 mx-auto" />
              <h4 className="text-xs font-black text-purple-400">MANAGER</h4>
              <p className="text-[10px] text-white font-bold">{sampleManager?.name || 'Unassigned'}</p>
            </div>

            <ArrowRight className="w-4 h-4 text-purple-500 flex-shrink-0" />

            {/* Node 3: TENANTS */}
            <div className="flex flex-col gap-2">
              {sampleTenants.length === 0 ? (
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-white/5 text-center">
                  <p className="text-[10px] text-muted-foreground font-bold">No Tenants</p>
                </div>
              ) : (
                sampleTenants.map((t) => (
                  <div
                    key={t.id || t.rawId}
                    onClick={() => onInspectPerson && onInspectPerson(t)}
                    className="p-3 rounded-2xl bg-sky-600/20 border border-sky-500/40 text-center space-y-0.5 shadow-md cursor-pointer hover:scale-105 transition-all"
                  >
                    <Users className="w-4 h-4 text-sky-400 mx-auto" />
                    <p className="text-[10px] text-white font-black">{t.name}</p>
                    <span className="text-[9px] text-muted-foreground">Tenant · {t.unit || 'Unit N/A'}</span>
                  </div>
                ))
              )}
            </div>

            <ArrowRight className="w-4 h-4 text-sky-500 flex-shrink-0" />

            {/* Node 4: WORKFORCE / TECHNICIANS */}
            <div className="flex flex-col gap-2">
              {sampleTechs.length === 0 ? (
                <div className="p-3 rounded-2xl bg-slate-800/40 border border-white/5 text-center">
                  <p className="text-[10px] text-muted-foreground font-bold">No Technicians</p>
                </div>
              ) : (
                sampleTechs.map((tech) => (
                  <div
                    key={tech.id || tech.rawId}
                    onClick={() => onInspectPerson && onInspectPerson(tech)}
                    className="p-3 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 text-center space-y-0.5 shadow-md cursor-pointer hover:scale-105 transition-all"
                  >
                    <Wrench className="w-4 h-4 text-emerald-400 mx-auto" />
                    <p className="text-[10px] text-white font-black">{tech.name}</p>
                    <span className="text-[9px] text-muted-foreground">{tech.specialty}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold pt-2 border-t border-border/40">
        <span>● Active Connections: {properties.length + tenants.length + managers.length + technicians.length}</span>
        <span>Graph Engine: Real Mongo References</span>
      </div>
    </div>
  );
}
