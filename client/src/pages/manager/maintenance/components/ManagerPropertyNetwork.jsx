import React from 'react';
import { Building, ArrowRight, AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../../utils/cn';

export default function ManagerPropertyNetwork({ properties = [], requests = [], theme }) {
  const navigate = useNavigate();

  return (
    <div className={cn(
      "p-6 rounded-[2.25rem] border shadow-2xl space-y-4 backdrop-blur-2xl transition-all",
      theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
    )}>
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Building className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-black tracking-tight">My Managed Property Network</h3>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          {properties.length} Properties
        </span>
      </div>

      {properties.length === 0 ? (
        <div className="p-8 border border-dashed rounded-3xl text-center space-y-1 text-muted-foreground">
          <Building className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-xs font-bold">No assigned properties found</p>
          <p className="text-[10px]">Properties assigned to your manager account will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {properties.map((p) => {
            const propReqs = requests.filter(r => r.property?._id === p._id || r.property === p._id || r.property?.name === p.name);
            const openCount = propReqs.filter(r => ['open', 'submitted'].includes(r.status)).length;
            const activeCount = propReqs.filter(r => ['in_progress', 'technician_assigned', 'visit_scheduled'].includes(r.status)).length;
            const slaRisk = propReqs.filter(r => r.priority === 'emergency' || r.priority === 'high').length;

            return (
              <div
                key={p._id}
                className={cn(
                  "p-5 rounded-3xl border shadow-lg transition-all space-y-4 hover:scale-[1.02] flex flex-col justify-between",
                  theme === 'light' ? "bg-slate-100/80 border-slate-200 text-slate-900" : "bg-slate-900/60 border-white/10 text-white"
                )}
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-md">
                      {p.name?.substring(0, 2).toUpperCase() || 'PR'}
                    </div>
                    <div>
                      <h4 className="text-sm font-black tracking-tight">{p.name}</h4>
                      <p className="text-[10px] text-muted-foreground font-medium">📍 {p.city || 'Location N/A'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center text-xs pt-2">
                    <div className="p-2 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                      <span className="text-[9px] font-black uppercase text-rose-400 block">Open</span>
                      <p className="font-mono font-black text-rose-500">{openCount}</p>
                    </div>
                    <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                      <span className="text-[9px] font-black uppercase text-amber-400 block">Active</span>
                      <p className="font-mono font-black text-amber-500">{activeCount}</p>
                    </div>
                    <div className="p-2 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                      <span className="text-[9px] font-black uppercase text-purple-400 block">SLA Risk</span>
                      <p className="font-mono font-black text-purple-400">{slaRisk}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/admin/property/${p._id}`)}
                  className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  View Property <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
