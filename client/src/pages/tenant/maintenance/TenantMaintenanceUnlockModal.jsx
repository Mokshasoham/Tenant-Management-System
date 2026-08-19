import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wrench, Check, CheckCircle2, ShieldCheck, Loader2, AlertCircle, Building2 } from 'lucide-react';
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg rounded-[28px] bg-[#0A0F1D] border border-amber-500/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_-10px_rgba(245,158,11,0.12)] overflow-hidden text-slate-100 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10 shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Unlock Maintenance Feature
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{propertyName}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
            {/* Coverage Plan Card */}
            <div className="relative p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0D1424] to-slate-950/90 border border-amber-500/25 shadow-lg shadow-black/40 overflow-hidden">
              {/* Subtle ambient amber backlight */}
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/90 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>COVERAGE PLAN</span>
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-white tracking-tight">
                    Comprehensive Maintenance
                  </h4>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight drop-shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                    ₹{fee}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    / {frequency}
                  </div>
                </div>
              </div>
            </div>

            {/* What's Included Feature Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black tracking-wider uppercase text-slate-400">
                  WHAT'S INCLUDED:
                </span>
                <span className="text-[10px] text-amber-400/80 font-semibold uppercase tracking-wider">
                  6 Premium Perks
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
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/70 hover:border-amber-500/25 hover:bg-slate-900/50 transition-all duration-200 group"
                  >
                    <div className="w-5 h-5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-110 transition-transform">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Terms & Conditions Checkbox Container */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-colors">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/30 focus:ring-offset-0 accent-amber-500 cursor-pointer shrink-0"
                />
                <span className="text-xs text-slate-400 leading-relaxed font-normal">
                  I agree to the Maintenance Terms &amp; Conditions and authorize the payment of ₹{fee} to activate coverage for this property.
                </span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-5 sm:p-6 bg-slate-950/70 border-t border-slate-800/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-slate-700/50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || !termsAgreed}
              onClick={handlePayAndUnlock}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:via-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 transition-all duration-200 disabled:opacity-40 disabled:grayscale disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
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

