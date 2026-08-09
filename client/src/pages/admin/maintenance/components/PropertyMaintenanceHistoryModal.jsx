import React from 'react';
import { X, Building2, Calendar, Wrench, CheckCircle2, Clock, AlertTriangle, DollarSign, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../../utils/cn';

export default function PropertyMaintenanceHistoryModal({ property, onClose, theme }) {
  if (!property) return null;

  // Mock property-specific historical logs
  const historyTimeline = [
    {
      id: 'HIST-101',
      date: '2026-08-06',
      title: 'Water Leakage in Kitchen Sink',
      unit: 'Unit 48',
      status: 'In Progress',
      cost: 2450,
      tech: 'Ravi Kumar',
      category: 'Plumbing',
    },
    {
      id: 'HIST-098',
      date: '2026-07-28',
      title: 'AC Compressor Servicing & Gas Refill',
      unit: 'Unit 12',
      status: 'Resolved',
      cost: 3200,
      tech: 'Arun Kumar',
      category: 'HVAC',
    },
    {
      id: 'HIST-084',
      date: '2026-07-14',
      title: 'Electrical Circuit Breaker Replacement',
      unit: 'Unit 05',
      status: 'Resolved',
      cost: 1800,
      tech: 'Vikram Singh',
      category: 'Electrical',
    },
    {
      id: 'HIST-062',
      date: '2026-06-30',
      title: 'Bathroom Flush Tank Leakage Repair',
      unit: 'Unit 19',
      status: 'Resolved',
      cost: 1100,
      tech: 'Ravi Kumar',
      category: 'Plumbing',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] border shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-hidden relative backdrop-blur-2xl space-y-6",
          theme === 'light' ? "bg-white border-slate-200 text-slate-900" : "bg-[#0c0d15] border-white/10 text-white"
        )}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-start pb-4 border-b border-border/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest">
                PROPERTY MAINTENANCE HISTORY
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">{property.name}</h2>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              📍 {property.city} · ID: {property.propertyId}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:bg-slate-800/40 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className={cn("p-3 rounded-2xl border space-y-0.5", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/5")}>
            <span className="text-[9px] text-muted-foreground font-bold block">Active Req</span>
            <p className="font-mono font-black text-rose-500 text-sm">{property.activeRequestsCount}</p>
          </div>
          <div className={cn("p-3 rounded-2xl border space-y-0.5", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/5")}>
            <span className="text-[9px] text-muted-foreground font-bold block">Avg Resolution</span>
            <p className="font-mono font-black text-indigo-400 text-sm">{property.avgResolutionHours}h</p>
          </div>
          <div className={cn("p-3 rounded-2xl border space-y-0.5", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/5")}>
            <span className="text-[9px] text-muted-foreground font-bold block">Monthly Cost</span>
            <p className="font-mono font-black text-emerald-400 text-sm">₹{property.monthlyCost?.toLocaleString()}</p>
          </div>
          <div className={cn("p-3 rounded-2xl border space-y-0.5", theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/5")}>
            <span className="text-[9px] text-muted-foreground font-bold block">Health Score</span>
            <p className={cn("font-mono font-black text-sm", property.healthScore < 80 ? "text-rose-500" : "text-emerald-500")}>
              {property.healthScore}/100
            </p>
          </div>
        </div>

        {/* Recurring Alert Notice if any */}
        {property.recurringAlert && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{property.recurringAlert}</span>
          </div>
        )}

        {/* Historical Maintenance Stream */}
        <div className="space-y-3 flex-1 overflow-y-auto pr-1 max-h-[320px]">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-indigo-400" /> Historical Maintenance Logs
          </h3>

          <div className="space-y-2.5">
            {historyTimeline.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs backdrop-blur-xl transition-all",
                  theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-white/5"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black">{item.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    📅 {item.date} · {item.unit} · Technician: {item.tech}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                  <span className="font-mono font-black text-emerald-400">₹{item.cost?.toLocaleString()}</span>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-black border",
                    item.status === 'Resolved'
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  )}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-border/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-xl transition-all cursor-pointer"
          >
            Close History Workspace
          </button>
        </div>
      </motion.div>
    </div>
  );
}
