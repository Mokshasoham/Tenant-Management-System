import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wrench, Send, UserCheck, Hammer, QrCode, ShieldCheck, ArrowRight } from 'lucide-react';

export default function TenantMaintenanceHowItWorksModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const steps = [
    {
      step: '01',
      title: 'Submit Request',
      description: 'Describe the issue, choose a priority (low, medium, high, emergency), and attach photos or videos in seconds.',
      icon: Send,
      badge: 'Step 1'
    },
    {
      step: '02',
      title: 'Technician Assignment',
      description: 'Your property manager assigns a certified, vetted technician who schedules an on-site visit.',
      icon: UserCheck,
      badge: 'Step 2'
    },
    {
      step: '03',
      title: 'Live Repair & Resolution',
      description: 'Track the repair status in real time. The technician performs diagnostic visits and fixes the reported issue.',
      icon: Hammer,
      badge: 'Step 3'
    },
    {
      step: '04',
      title: 'QR Code Verification',
      description: 'Upon completion, verify resolution via unique ticket QR code scanning and provide your rating & feedback.',
      icon: QrCode,
      badge: 'Step 4'
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#02050D]/85 backdrop-blur-xl font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 16 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl rounded-[30px] bg-gradient-to-b from-[#0B132B] via-[#070D1F] to-[#040814] border border-amber-500/25 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.95),0_0_60px_-15px_rgba(245,158,11,0.15)] overflow-hidden text-slate-100 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-6 sm:p-7 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/25 via-orange-500/15 to-[#0B132B] border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
                <Wrench className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400">
                  MAINTENANCE PROCESS
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                  How Maintenance &amp; Repairs Works
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-800/50 hover:bg-white/10 border border-slate-700/60 hover:border-slate-500 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Steps Body */}
          <div className="p-6 sm:p-7 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {steps.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-[#091024]/90 border border-slate-800/80 hover:border-amber-500/30 transition-all duration-200 space-y-3 group shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-mono font-black text-amber-400/80 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                        {item.step}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Guarantee Note */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-xs text-slate-300">
                All maintenance tickets are backed by certified technicians, service level tracking, and digital QR sign-off verification.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 sm:p-6 bg-[#03060F]/95 border-t border-slate-800/80 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              Got It
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
