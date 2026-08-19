import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Sparkles,
  ArrowRight,
  X,
  Building2,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../../utils/cn';

export default function TenantLeaseLimitModal({
  isOpen,
  onClose,
  currentCount = 2,
  maxLimit = 2,
  planName = 'Resident Free',
  onUpgradeClick,
}) {
  const navigate = useNavigate();
  if (!isOpen) return null;

  const handleGoToSubscription = () => {
    onClose();
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      navigate('/subscription');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#02050D]/85 backdrop-blur-xl font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md rounded-[30px] bg-gradient-to-b from-[#0C1E20] via-[#061215] to-[#02080B] border border-emerald-500/40 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.95),0_0_40px_rgba(16,185,129,0.15)] overflow-hidden text-slate-100"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400 block">
                  CAPACITY LIMIT REACHED
                </span>
                <h3 className="text-sm font-black text-white">
                  Lease Limit Reached
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800/50 hover:bg-white/10 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 sm:p-7 space-y-5">
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              You’ve reached the <span className="text-amber-400 font-bold">{maxLimit}-lease limit</span> of your{' '}
              <span className="text-white font-bold">{planName}</span>. Upgrade to manage more rental properties seamlessly.
            </p>

            {/* Visual Capacity Comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Current Usage
                </span>
                <span className="text-sm font-black text-amber-400 font-mono block">
                  {currentCount} / {maxLimit} Leases
                </span>
                <span className="text-[10px] text-slate-500 font-medium">At full capacity</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Resident Plus
                </span>
                <span className="text-sm font-black text-emerald-300 font-mono block">
                  Up to 4 Leases
                </span>
                <span className="text-[10px] text-emerald-400/80 font-medium">+2 more lease slots</span>
              </div>
            </div>

            {/* Key Upgrade Benefits */}
            <div className="space-y-2 pt-1">
              {[
                'Manage up to 4 active & upcoming leases',
                'Priority resident support desk',
                'Consolidated payment records & analytics',
              ].map((b, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="p-5 sm:p-6 bg-[#03060F]/95 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer"
            >
              Not Now
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleGoToSubscription}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upgrade Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
