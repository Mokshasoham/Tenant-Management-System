import React from 'react';
import { UserCheck, Star, Building, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../../utils/cn';

export default function ManagerSpatialCard({ manager, onInspect, theme }) {
  const navigate = useNavigate();

  return (
    <div className={cn(
      "p-5 rounded-[2rem] border shadow-xl space-y-4 backdrop-blur-2xl transition-all hover:scale-[1.02] flex flex-col justify-between",
      theme === 'light'
        ? "bg-white/80 border-slate-200/80 shadow-slate-200/50 text-slate-900"
        : "bg-[#0c0d15]/80 border-white/10 shadow-black/60 text-white"
    )}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md">
            {manager.name?.substring(0, 2).toUpperCase() || 'MG'}
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight">{manager.name}</h3>
            <p className="text-[10px] text-muted-foreground font-mono font-bold">ID: {manager.id}</p>
          </div>
        </div>

        {manager.rating && (
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-current" /> {manager.rating}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
        <div className="p-2.5 rounded-2xl bg-slate-900/40 border border-white/5 space-y-0.5">
          <span className="text-[9px] text-muted-foreground block font-bold">Managed Portfolio</span>
          <p className="font-extrabold text-purple-400">{manager.managedPropertiesCount || 0} Properties</p>
        </div>
        <div className="p-2.5 rounded-2xl bg-slate-900/40 border border-white/5 space-y-0.5">
          <span className="text-[9px] text-muted-foreground block font-bold">Status</span>
          <p className="font-extrabold text-indigo-400 uppercase text-xs">{manager.status || 'Active'}</p>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => onInspect && onInspect(manager)}
          className={cn(
            "flex-1 py-2 rounded-full text-xs font-black transition-all border cursor-pointer",
            theme === 'light' ? "bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200" : "bg-slate-900 border-white/10 text-slate-200 hover:bg-slate-800"
          )}
        >
          Quick Inspect
        </button>
        <button
          onClick={() => navigate(`/admin/people/managers/${manager.id}`)}
          className="flex-1 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
        >
          View Portfolio <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
