import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, CheckCircle2, ShieldCheck, Loader2, AlertCircle, Sparkles } from 'lucide-react';
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
        theme: { color: '#6366f1' },
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-indigo-500/40 shadow-2xl overflow-hidden text-slate-100"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Unlock Maintenance Feature</h3>
                <p className="text-xs text-slate-400">{propertyName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pricing & Benefits */}
          <div className="p-6 space-y-5">
            {/* Price Tag */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">Coverage Plan</span>
                <h4 className="text-base font-bold text-white">Comprehensive Maintenance</h4>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-indigo-400">₹{fee}</span>
                <span className="text-[11px] text-slate-400"> / {frequency}</span>
              </div>
            </div>

            {/* Feature Checklist */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">What's Included:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Maintenance Requests</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Technician Assignment</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Live Repair Tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Scheduled Visits</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>QR Ticket Verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Maintenance History</span>
                </div>
              </div>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Terms checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs text-slate-400 leading-tight">
                I agree to the Maintenance Terms &amp; Conditions and authorize the payment of ₹{fee} to activate coverage for this property.
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-slate-950/60 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || !termsAgreed}
              onClick={handlePayAndUnlock}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
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
