import React from 'react';
import { X, ShieldCheck, MapPin, Building, Calendar, Wrench, ArrowRight, History, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../../utils/cn';

export default function PersonInspectionDrawer({ person, onClose, theme }) {
  if (!person) return null;

  const navigate = useNavigate();

  const getProfileRoute = () => {
    if (person.role === 'tenant') return `/admin/people/tenants/${person.id || 'T-2026-0012'}`;
    if (person.role === 'manager') return `/admin/people/managers/${person.id || 'MGR-2026-001'}`;
    return `/admin/people/technicians/${person.id || 'TECH-2026-101'}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "w-full max-w-lg h-full border-l p-6 flex flex-col justify-between shadow-2xl overflow-y-auto space-y-6",
          theme === 'light' ? "bg-white border-slate-200 text-slate-900" : "bg-[#0c0d15] border-white/10 text-white"
        )}
      >
        {/* Drawer Header */}
        <div className="space-y-3 pb-4 border-b border-border/50">
          <div className="flex justify-between items-start">
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-mono font-black border uppercase",
              person.role === 'tenant'
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : person.role === 'manager'
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            )}>
              {person.role || 'TENANT'} · {person.status || 'Active'}
            </span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-xl font-black tracking-tight">{person.name}</h2>
          <p className="text-xs text-muted-foreground font-medium">{person.email} · {person.phone || '+91 98765 00000'}</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className={cn(
            "p-3.5 rounded-2xl border space-y-1 backdrop-blur-xl",
            theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-white/5"
          )}>
            <span className="text-[10px] font-bold text-muted-foreground block">Trust Score</span>
            <p className="font-mono font-black text-indigo-400 text-base">{person.trustScore || 91}/100</p>
          </div>

          <div className={cn(
            "p-3.5 rounded-2xl border space-y-1 backdrop-blur-xl",
            theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-white/5"
          )}>
            <span className="text-[10px] font-bold text-muted-foreground block">Verification Status</span>
            <p className="font-mono font-black text-emerald-400 text-xs flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified
            </p>
          </div>
        </div>

        {/* Location & Property */}
        <div className={cn(
          "p-4 rounded-3xl border space-y-2 backdrop-blur-xl shadow-lg",
          theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-white/5"
        )}>
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
            Current Location & Residence
          </span>
          <p className="text-xs font-black flex items-center gap-1.5 text-indigo-400">
            <Building className="w-4 h-4" /> {person.propertyName || person.currentLocation || 'Ocean Pearl Residency'}
          </p>
          <p className="text-[11px] text-muted-foreground font-medium">
            📍 {person.city || 'Hyderabad'} · {person.unit || 'Unit 4B'}
          </p>
        </div>

        {/* Lease & Maintenance Summary */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className={cn(
            "p-3.5 rounded-2xl border space-y-1 backdrop-blur-xl",
            theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-white/5"
          )}>
            <span className="text-[10px] font-bold text-muted-foreground block">Lease Standing</span>
            <p className="font-extrabold text-emerald-400">{person.leaseStatus || 'Active (10 mos)'}</p>
          </div>

          <div className={cn(
            "p-3.5 rounded-2xl border space-y-1 backdrop-blur-xl",
            theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-white/5"
          )}>
            <span className="text-[10px] font-bold text-muted-foreground block">Open Maintenance</span>
            <p className="font-extrabold text-rose-500">{person.openMaintenanceCount || 2} Open Requests</p>
          </div>
        </div>

        {/* Activity Stream */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-400" /> Recent Spatial Activity
          </h4>
          <div className="space-y-2 text-[11px]">
            {(person.activityTimeline || [
              { timestamp: 'Today', title: 'Rent Payment Received', details: 'Paid ₹32,000 via UPI' },
              { timestamp: 'Yesterday', title: 'Maintenance Ticket Submitted', details: 'Water leakage in kitchen' }
            ]).map((act, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-0.5">
                <div className="flex justify-between font-bold text-indigo-400 text-[10px]">
                  <span>{act.title}</span>
                  <span>{act.timestamp}</span>
                </div>
                <p className="text-muted-foreground text-[10px]">{act.details}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Link to Profile Workspace */}
        <div className="pt-4 border-t border-border/50 flex justify-end">
          <button
            onClick={() => {
              onClose();
              navigate(getProfileRoute());
            }}
            className="w-full py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            View Full Inspection Profile <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
