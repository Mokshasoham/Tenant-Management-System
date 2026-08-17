import React from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, X, ArrowRight, Home } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function TenantLeaseSelectModal({ leases = [], onSelectLease, onClose, theme }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[600] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className={cn(
          "w-full max-w-lg p-6 sm:p-8 rounded-[2.5rem] border shadow-2xl space-y-6 my-8 max-h-[88vh] overflow-y-auto scrollbar-none",
          theme === 'light'
            ? "bg-white text-slate-900 border-slate-200"
            : "bg-[#0c0d15] text-white border-white/15 shadow-black"
        )}
      >
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 block">
                Select Lease / Property
              </span>
              <h3 className="text-base sm:text-lg font-black tracking-tight mt-0.5">
                Which property is this request for?
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Please select the lease associated with this maintenance issue
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Leases List */}
        <div className="space-y-3">
          {leases.map((lease, index) => {
            const propName = lease.property?.name || `Property #${index + 1}`;
            const address = lease.property?.address
              ? `${lease.property.address}${lease.property.city ? `, ${lease.property.city}` : ''}`
              : 'Address on file';
            const rent = lease.rentAmount || lease.monthlyRent || lease.rent;
            const isUpcoming = lease.status === 'pending';
            const leaseNum = lease.leaseNumber || String(lease._id).slice(-8);

            return (
              <motion.button
                key={lease._id}
                whileHover={{ scale: 1.015, y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSelectLease(lease)}
                className={cn(
                  "w-full text-left p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 group cursor-pointer shadow-sm hover:shadow-lg",
                  theme === 'light'
                    ? "bg-slate-50/90 border-slate-200 hover:border-amber-500/50 hover:bg-amber-500/5"
                    : "bg-slate-900/60 border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5"
                )}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-sm",
                    isUpcoming
                      ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white"
                  )}>
                    <Home className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-foreground group-hover:text-amber-500 transition-colors truncate">
                        {propName}
                      </h4>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                        isUpcoming
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      )}>
                        {isUpcoming ? 'Upcoming' : 'Active'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{address}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80 pt-0.5">
                      <span className="font-mono font-bold">Lease #{leaseNum}</span>
                      {rent && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-foreground">₹{Number(rent).toLocaleString('en-IN')}/mo</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-xl bg-muted/40 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center shrink-0 transition-all text-muted-foreground">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Footer / Cancel */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl border border-border text-xs font-black text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
