import React, { useState } from 'react';
import { Layers, Building, Wrench, ShieldAlert, CheckCircle2, User, ChevronRight } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function PeopleSpatial3D({ digitalTwinData, onInspectPerson, theme }) {
  const [selectedFloor, setSelectedFloor] = useState(3);
  const twin = digitalTwinData || {};
  const currentFloor = (twin.floors || []).find((f) => f.floorNumber === selectedFloor) || twin.floors?.[0];

  const getStatusColor = (color) => {
    switch (color) {
      case 'green': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'blue': return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
      case 'yellow': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'red': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'purple': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-slate-800/40 text-slate-400 border-white/5';
    }
  };

  return (
    <div className={cn(
      "h-[420px] w-full rounded-[2.25rem] border shadow-2xl p-6 flex flex-col justify-between relative transition-all backdrop-blur-2xl overflow-hidden",
      theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
    )}>
      {/* 3D Header */}
      <div className="flex justify-between items-center z-10">
        <div>
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest">
            3D DIGITAL TWIN OVERVIEW
          </span>
          <h3 className={cn("text-base font-black tracking-tight mt-1", theme === 'light' ? "text-slate-900" : "text-white")}>
            {twin.propertyName || 'Ocean Pearl Residency'}
          </h3>
        </div>

        {/* Floor Selection Pills */}
        <div className={cn(
          "flex p-1 rounded-full border text-xs font-bold",
          theme === 'light' ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-white/10"
        )}>
          {(twin.floors || []).map((fl) => (
            <button
              key={fl.floorNumber}
              onClick={() => setSelectedFloor(fl.floorNumber)}
              className={cn(
                "px-3.5 py-1.5 rounded-full transition-all cursor-pointer",
                selectedFloor === fl.floorNumber
                  ? "bg-indigo-600 text-white shadow-md font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {fl.floorLabel}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Isometric Floor Grid View */}
      <div className="flex-1 my-4 flex items-center justify-center relative">
        <div className="w-full max-w-xl grid grid-cols-2 sm:grid-cols-4 gap-3 z-10">
          {(currentFloor?.units || []).map((u) => (
            <div
              key={u.unit}
              className={cn(
                "p-4 rounded-2xl border flex flex-col justify-between gap-3 shadow-xl backdrop-blur-xl transition-all hover:scale-105 cursor-pointer relative overflow-hidden",
                getStatusColor(u.color)
              )}
            >
              {/* Unit Tag & Indicator */}
              <div className="flex justify-between items-center">
                <span className="font-mono font-black text-xs">Unit {u.unit}</span>
                <span className="w-2 h-2 rounded-full bg-current shadow-sm animate-pulse" />
              </div>

              {/* Tenant / Status Name */}
              <div className="space-y-0.5">
                <p className="text-xs font-black truncate">{u.tenant}</p>
                <p className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">{u.status}</p>
              </div>

              {/* 3D Workforce Positioning Overlay */}
              {u.technician && (
                <div className="p-1.5 rounded-xl bg-indigo-600 text-white font-bold text-[9px] flex items-center gap-1.5 shadow-md">
                  <Wrench className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">🔧 {u.technician}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend & 3D Status Bar */}
      <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground pt-2 border-t border-border/40 z-10">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Occupied</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> Vacant</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Pending</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500" /> Maintenance</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> High Risk</span>
        </div>

        <span className="text-indigo-400 font-black">Digital Twin v2.4 Active</span>
      </div>
    </div>
  );
}
