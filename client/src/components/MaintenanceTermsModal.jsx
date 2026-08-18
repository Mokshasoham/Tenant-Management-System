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
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-100 font-sans"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Maintenance &amp; Repairs Terms
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-mono">
                    v{version}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Optional Property Add-On Agreement</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Terms Content */}
          <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed border-b border-slate-800 max-h-[50vh]">
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-2.5 text-indigo-200">
              <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
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
          <div className="p-6 bg-slate-950/60 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs text-slate-300">
                I have read and agree to the <strong>Maintenance &amp; Repairs Terms &amp; Conditions</strong> and authorize the additional ₹{fee}/month coverage.
              </span>
            </label>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!agreed}
                onClick={handleContinue}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
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
