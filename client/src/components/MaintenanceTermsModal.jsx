import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

export default function MaintenanceTermsModal({ isOpen, onClose, onAccept, fee = 500, version = '1.0' }) {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const handleContinue = () => {
    if (agreed) {
      onAccept();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-[28px] bg-[#0A0F1D] border border-amber-500/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_-10px_rgba(245,158,11,0.12)] overflow-hidden text-slate-100 font-sans"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                  Maintenance &amp; Repairs Terms
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-amber-400/90 font-mono font-medium">
                    v{version}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Optional Property Add-On Agreement</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Terms Content */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed border-b border-slate-800/80 max-h-[50vh]">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/25 flex items-start gap-2.5 text-amber-200/90">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs">
                By including the <strong>Maintenance &amp; Repairs Add-On</strong> for ₹{fee}/month, your lease receives complete repair management, priority certified technician dispatch, and digital QR tracking.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-white text-xs mb-1">1. Scope of Covered Services</h4>
                <p className="text-slate-400">
                  Includes comprehensive diagnostic visits and corrective repairs for normal wear-and-tear issues across:
                </p>
                <ul className="list-disc pl-5 mt-1 space-y-0.5 text-slate-400">
                  <li>Plumbing fixtures, pipe leaks, drainage, and water supply valves.</li>
                  <li>Electrical systems, circuit breakers, switches, and core lighting fixtures.</li>
                  <li>HVAC servicing, air conditioning diagnostics, and filter replacements.</li>
                  <li>Built-in kitchen/laundry appliances provided by the landlord.</li>
                  <li>Door locks, hinges, and essential structural hardware.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-white text-xs mb-1">2. Service Level &amp; Technician Dispatch</h4>
                <p className="text-slate-400">
                  Maintenance tickets are assigned to certified property technicians. Emergency requests receive high-priority dispatch within 4 hours. Standard repair requests are scheduled in coordination with the tenant.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-xs mb-1">3. QR-Based Resolution &amp; Verification</h4>
                <p className="text-slate-400">
                  Each ticket generates a unique secure Ticket QR code. Technicians scan the QR upon work completion, and tenants confirm resolution via their portal.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-xs mb-1">4. Exclusions &amp; Misuse</h4>
                <p className="text-slate-400">
                  Damage caused by intentional tenant negligence, unauthorized alterations, or personal tenant belongings are not covered under the standard plan and may be billed separately.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-xs mb-1">5. Billing &amp; Frequency</h4>
                <p className="text-slate-400">
                  The maintenance fee of ₹{fee} is billed monthly in addition to property rent. The coverage is tied exclusively to this specific lease and property.
                </p>
              </div>
            </div>
          </div>

          {/* Agreement Checkbox & Actions */}
          <div className="p-5 sm:p-6 bg-slate-950/70 space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-colors">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/30 focus:ring-offset-0 accent-amber-500 cursor-pointer shrink-0"
                />
                <span className="text-xs text-slate-300 leading-relaxed">
                  I have read and agree to the <strong>Maintenance &amp; Repairs Terms &amp; Conditions</strong> and authorize the additional ₹{fee}/month coverage.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-slate-700/50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!agreed}
                onClick={handleContinue}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:via-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 transition-all duration-200 disabled:opacity-40 disabled:grayscale disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
              >
                <CheckCircle2 className="w-4 h-4" />
                Agree &amp; Continue
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
