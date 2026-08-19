import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wrench, Check, ShieldCheck, Loader2, AlertCircle, Building2, Lock, Sparkles } from 'lucide-react';
import { maintenanceService } from '../../../services/api';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function TenantMaintenanceUnlockModal({
  isOpen,
  onClose,
  lease,
  fee = 500,
  frequency = 'monthly',
  onSuccess
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [termsAgreed, setTermsAgreed] = useState(false);

  if (!isOpen) return null;

  const leaseId = lease?._id || lease?.id;
  const propertyName = lease?.property?.name || lease?.propertyName || 'Your Property';

  const handlePayAndUnlock = async () => {
    if (!termsAgreed) {
      setError('Please agree to the Maintenance Terms & Conditions.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create Razorpay order on backend
      const res = await maintenanceService.createUnlockOrder({ leaseId });
      const { razorpayOrderId, amount, keyId } = res?.data?.data || res?.data || res;

      if (!razorpayOrderId) {
        throw new Error('Could not initiate payment order from server.');
      }

      // 2. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      const rzp = new window.Razorpay({
        key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_SUn7uPXz1VaEa1',
        amount,
        currency: 'INR',
        order_id: razorpayOrderId,
        name: 'TMS Maintenance & Repairs',
        description: `Maintenance Coverage for ${propertyName}`,
        theme: { color: '#f59e0b' },
        handler: async (response) => {
          try {
            // 3. Verify Razorpay payment on server
            const verifyRes = await maintenanceService.verifyUnlockPayment({
              leaseId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });

            console.log('[Unlock Modal] Verified:', verifyRes);
            if (onSuccess) onSuccess();
            onClose();
          } catch (verifyErr) {
            console.error('[Unlock Modal] Verification error:', verifyErr);
            setError(verifyErr?.response?.data?.message || verifyErr?.message || 'Payment verification failed.');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        }
      });

      rzp.open();
    } catch (err) {
      console.error('[Unlock Modal] Error initiating unlock:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to initiate unlock payment.');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#02050D]/85 backdrop-blur-xl font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 16 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl rounded-[30px] bg-gradient-to-b from-[#0B132B] via-[#070D1F] to-[#040814] border border-amber-500/25 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.95),0_0_60px_-15px_rgba(245,158,11,0.15)] overflow-hidden text-slate-100 flex flex-col max-h-[94vh]"
        >
          {/* Subtle Background Decorative Graphic */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 opacity-[0.03] pointer-events-none text-amber-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-full h-full">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          
          <div className="absolute top-0 right-1/4 w-60 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="p-6 sm:p-7 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40 relative z-10">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500/30 to-orange-500/20 blur-sm pointer-events-none" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/25 via-orange-500/15 to-[#0B132B] border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
                  <Wrench className="w-6 h-6 stroke-[2.2]" />
                </div>
              </div>

              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400/90 flex items-center gap-1.5">
                  <span>MAINTENANCE COVERAGE</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight mt-0.5">
                  Unlock Maintenance Feature
                </h3>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1 font-medium text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-amber-400/70" />
                    {propertyName}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    COVERAGE AVAILABLE
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-9 h-9 rounded-full bg-slate-800/50 hover:bg-white/10 border border-slate-700/60 hover:border-slate-500 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-6 sm:p-7 space-y-6 overflow-y-auto relative z-10">
            {/* Hero Coverage Card */}
            <div className="relative p-5 sm:p-6 rounded-[22px] bg-gradient-to-br from-[#121E3E]/95 via-[#0D162E]/95 to-[#070D1C]/95 border border-amber-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_12px_30px_rgba(0,0,0,0.5)] overflow-hidden">
              {/* Subtle Ambient Backlights */}
              <div className="absolute -right-8 -top-8 w-36 h-36 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -left-8 -bottom-8 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[9px] font-black uppercase tracking-[0.2em] text-amber-300 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-amber-400" />
                      COVERAGE PLAN
                    </span>
                  </div>
                  <h4 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    Comprehensive Maintenance
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">
                    Complete property maintenance support
                  </p>
                </div>

                <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 border-slate-800/80 pt-3 sm:pt-0">
                  <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 tracking-tight drop-shadow-[0_0_16px_rgba(245,158,11,0.3)]">
                    ₹{fee}
                  </div>
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    / {frequency}
                  </div>
                </div>
              </div>
            </div>

            {/* Coverage Benefits Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black tracking-[0.2em] uppercase text-slate-400">
                  WHAT YOU GET
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400/90 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  6 BENEFITS INCLUDED
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  'Maintenance Requests',
                  'Technician Assignment',
                  'Live Repair Tracking',
                  'Scheduled Visits',
                  'QR Ticket Verification',
                  'Maintenance History'
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-[#091024]/80 hover:bg-[#0E1938] border border-slate-800/80 hover:border-amber-500/30 transition-all duration-200 group shadow-sm"
                  >
                    <div className="w-6 h-6 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-110 group-hover:border-amber-400/50 transition-all shadow-sm">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {/* Terms & Authorization Consent Card */}
            <div
              className={`p-4 rounded-2xl transition-all duration-200 ${
                termsAgreed
                  ? 'bg-[#0B1530] border border-amber-500/35 shadow-[0_0_25px_rgba(245,158,11,0.08)]'
                  : 'bg-[#070E20]/80 border border-slate-800/90 hover:border-slate-700/90'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                <Lock className="w-3 h-3 text-amber-400/90" />
                <span>Secure Authorization</span>
              </div>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded-md border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 focus:ring-offset-0 accent-amber-500 cursor-pointer shrink-0"
                />
                <span className="text-xs text-slate-300 leading-relaxed font-normal">
                  I agree to the Maintenance Terms &amp; Conditions and authorize the payment of ₹{fee} to activate coverage for this property.
                </span>
              </label>
            </div>

            {/* Payment Summary Strip */}
            <div className="px-4 py-3 rounded-xl bg-[#060B18]/90 border border-slate-800/70 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Maintenance Coverage</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                  Instant Activation
                </span>
              </span>
              <span className="font-black text-amber-400 text-sm">
                ₹{fee} / {frequency}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-5 sm:p-6 bg-[#03060F]/95 border-t border-slate-800/80 flex items-center justify-between gap-4 backdrop-blur-md relative z-10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="text-xs font-bold text-slate-400 hover:text-slate-200 px-3 py-2 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || !termsAgreed}
              onClick={handlePayAndUnlock}
              className="px-7 py-3.5 rounded-2xl text-xs sm:text-sm font-black tracking-wide bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:via-amber-500 hover:to-orange-500 text-white shadow-[0_8px_25px_-5px_rgba(245,158,11,0.35)] hover:shadow-[0_12px_30px_-5px_rgba(245,158,11,0.5)] transition-all duration-200 disabled:opacity-40 disabled:grayscale disabled:shadow-none disabled:cursor-not-allowed cursor-pointer flex items-center gap-2.5 hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Pay ₹{fee} &amp; Unlock</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

