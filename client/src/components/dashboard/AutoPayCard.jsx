import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { autoPayService, leaseService } from '../../services/api';
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  ShieldCheck,
  Building2,
  Calendar,
  X,
  ArrowRight,
  Loader2,
  AlertCircle,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Dynamically loads the Razorpay checkout script if not present.
 */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.onload = () => resolve(true);
      existing.onerror = () => resolve(false);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function AutoPayCard({ activeLeases: propsActiveLeases, onAutoPayUpdated }) {
  const [internalLeases, setInternalLeases] = useState(
    Array.isArray(propsActiveLeases) && propsActiveLeases.length > 0 ? propsActiveLeases : []
  );
  const [selectedLeaseId, setSelectedLeaseId] = useState(
    Array.isArray(propsActiveLeases) && propsActiveLeases.length > 0 ? propsActiveLeases[0]._id : ''
  );
  const [statusData, setStatusData] = useState(null);
  const [loadingLeases, setLoadingLeases] = useState(
    !Array.isArray(propsActiveLeases) || propsActiveLeases.length === 0
  );
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Fetch eligible leases independently if not provided by parent ──
  const fetchEligibleLeases = useCallback(async () => {
    setLoadingLeases(true);
    setLoadError('');
    try {
      const res = await leaseService.getMyLease();
      const resVal = res?.data?.data ? res.data : (res?.data || {});
      const rawLeases =
        resVal.activeLeases ||
        resVal.leases ||
        (resVal.data?.activeLeases) ||
        (resVal.data ? (Array.isArray(resVal.data) ? resVal.data : [resVal.data]) : []);
      const valid = (Array.isArray(rawLeases) ? rawLeases : []).filter(
        (l) => l && ['active', 'pending', 'upcoming'].includes(l.status)
      );

      setInternalLeases(valid);
      if (valid.length > 0) {
        setSelectedLeaseId((prev) => (valid.some((l) => l._id === prev) ? prev : valid[0]._id));
      }
    } catch (err) {
      console.warn('[AutoPayCard] Failed to fetch eligible leases:', err);
      setLoadError('Unable to load leases for Auto-Pay.');
    } finally {
      setLoadingLeases(false);
    }
  }, []);

  useEffect(() => {
    if (Array.isArray(propsActiveLeases) && propsActiveLeases.length > 0) {
      setInternalLeases(propsActiveLeases);
      setSelectedLeaseId((prev) =>
        propsActiveLeases.some((l) => l._id === prev) ? prev : propsActiveLeases[0]._id
      );
      setLoadingLeases(false);
    } else {
      fetchEligibleLeases();
    }
  }, [propsActiveLeases, fetchEligibleLeases]);

  // ── Fetch Auto-Pay status for currently selected lease ──
  const fetchStatus = useCallback(async () => {
    const targetId = selectedLeaseId || internalLeases[0]?._id;
    if (!targetId) {
      setLoadingStatus(false);
      return;
    }
    setLoadingStatus(true);
    setLoadError('');
    try {
      const res = await autoPayService.getStatus(targetId);
      if (res?.data?.success) {
        setStatusData(res.data.data);
      }
    } catch (err) {
      console.warn('[AutoPayCard] Failed to fetch Auto-Pay status:', err);
      setLoadError('Unable to load Auto-Pay status.');
    } finally {
      setLoadingStatus(false);
    }
  }, [selectedLeaseId, internalLeases]);

  useEffect(() => {
    if (selectedLeaseId) {
      fetchStatus();
    }
  }, [selectedLeaseId, fetchStatus]);

  const selectedLease =
    internalLeases.find((l) => l._id === selectedLeaseId) || internalLeases[0] || null;

  const handleOpenEnableModal = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setModalOpen(true);
  };

  // ── Enable Auto-Pay via real Razorpay recurring authorization ──
  const handleEnableAutoPay = async () => {
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const targetLeaseId = selectedLeaseId || selectedLease?._id || internalLeases[0]?._id;
    if (!targetLeaseId) {
      setErrorMsg('Please select a valid lease.');
      setSubmitting(false);
      return;
    }

    try {
      // 1. Request Setup Intent from backend (POST /api/autopay/setup-intent)
      const intentRes = await autoPayService.createSetupIntent({
        leaseId: targetLeaseId,
        paymentMethodType: 'upi_autopay',
      });

      if (!intentRes?.data?.success || !intentRes.data.data) {
        const serverMsg = intentRes?.data?.message;
        if (serverMsg?.includes('recurring payment configuration')) {
          throw new Error('Auto-Pay requires Razorpay recurring payment configuration.');
        }
        throw new Error(serverMsg || 'Unable to start Auto-Pay authorization. Please try again.');
      }

      const { orderId, keyId, amount, customerName, customerEmail, customerPhone } =
        intentRes.data.data;

      // 2. Load Razorpay checkout script
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        throw new Error('Razorpay payment gateway failed to load. Please check your internet connection.');
      }

      // 3. Open Razorpay Checkout for Mandate / Recurring Authorization
      const options = {
        key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_SUn7uPXz1VaEa1',
        amount: amount || 100, // ₹1 token registration
        currency: 'INR',
        name: 'Tenant Management System',
        description: `Auto-Pay Mandate Registration: ${selectedLease?.property?.name || 'Residence'}`,
        order_id: orderId,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        theme: {
          color: '#10b981',
        },
        handler: async function (response) {
          try {
            setSubmitting(true);
            // 4. Send verification payload back to backend (POST /api/autopay/verify-and-enable)
            const verifyRes = await autoPayService.verifyAndEnable({
              leaseId: targetLeaseId,
              razorpayOrderId: response.razorpay_order_id || orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              token: response.razorpay_token_id,
              paymentMethodType: 'upi_autopay',
            });

            if (verifyRes?.data?.success) {
              setSuccessMsg('Auto-Pay activated successfully!');
              setModalOpen(false);
              await fetchStatus();
              if (typeof onAutoPayUpdated === 'function') onAutoPayUpdated();
            } else {
              throw new Error(verifyRes?.data?.message || 'Verification failed. Auto-Pay could not be enabled.');
            }
          } catch (verErr) {
            console.error('[AutoPayCard] Verification error:', verErr);
            setErrorMsg(
              verErr?.response?.data?.message ||
                verErr.message ||
                'Verification failed. Auto-Pay could not be enabled.'
            );
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: function () {
            // User closed/cancelled checkout: keep Auto-Pay OFF
            setSubmitting(false);
          },
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', function (failure) {
        console.error('[AutoPayCard] Razorpay payment failed:', failure);
        setErrorMsg(failure?.error?.description || 'Auto-Pay authorization failed. Please try again.');
        setSubmitting(false);
      });
      rzpInstance.open();
    } catch (err) {
      console.error('[AutoPayCard] Setup error:', err);
      if (
        err?.response?.status === 503 ||
        err?.response?.data?.message?.includes('recurring payment configuration')
      ) {
        setErrorMsg('Auto-Pay requires Razorpay recurring payment configuration.');
      } else {
        const msg =
          err?.response?.data?.message ||
          err.message ||
          'Unable to start Auto-Pay authorization. Please try again.';
        setErrorMsg(msg);
      }
      setSubmitting(false);
    }
  };

  // ── Disable Auto-Pay ──
  const handleDisableAutoPay = async () => {
    setSubmitting(true);
    setErrorMsg('');
    const targetLeaseId = selectedLeaseId || selectedLease?._id || internalLeases[0]?._id;
    try {
      const res = await autoPayService.disable({ leaseId: targetLeaseId });
      if (res?.data?.success) {
        setDisableConfirmOpen(false);
        setModalOpen(false);
        await fetchStatus();
        if (typeof onAutoPayUpdated === 'function') onAutoPayUpdated();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err.message || 'Failed to disable Auto-Pay.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading Skeleton ──
  if (loadingLeases) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-card/60 border border-border/80 p-6 shadow-xl backdrop-blur-xl animate-pulse">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-muted/60" />
            <div className="space-y-2">
              <div className="w-28 h-4 rounded-lg bg-muted/60" />
              <div className="w-56 h-3 rounded-lg bg-muted/40" />
            </div>
          </div>
          <div className="w-36 h-10 rounded-2xl bg-muted/60" />
        </div>
      </div>
    );
  }

  // ── Empty State if no eligible leases found ──
  if (internalLeases.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-card border border-border/80 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
                Auto-Pay
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                No active lease agreements found for automatic rent payments.
              </p>
            </div>
          </div>
          {loadError && (
            <button
              onClick={fetchEligibleLeases}
              className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const isAutoPayActive = statusData?.enabled && statusData?.status === 'active';
  const monthlyAmount =
    statusData?.monthlyAmount ||
    selectedLease?.rentAmount ||
    (selectedLease?.property?.rentAmount) ||
    0;

  const nextDueDate = statusData?.schedule?.nextPaymentDueAt
    ? new Date(statusData.schedule.nextPaymentDueAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : selectedLease?.startDate
    ? new Date(selectedLease.startDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : 'Upcoming Cycle';

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-card border border-border/80 p-6 shadow-xl backdrop-blur-xl transition-all duration-300">
        {/* Glow ambient decoration */}
        <div
          className={cn(
            'absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-500',
            isAutoPayActive ? 'bg-emerald-500' : 'bg-emerald-600/30'
          )}
        />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left Info Column */}
          <div className="space-y-2.5 flex-1 w-full lg:w-auto">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm transition-colors',
                  isAutoPayActive
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                )}
              >
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
                    Auto-Pay
                  </h3>
                  <span
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1.5 shadow-sm',
                      isAutoPayActive
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 dark:text-emerald-400'
                        : 'bg-muted/40 border-border text-muted-foreground/60'
                    )}
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        isAutoPayActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'
                      )}
                    />
                    {isAutoPayActive ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAutoPayActive
                    ? 'Your monthly rent will be automatically paid on the scheduled lease due date.'
                    : 'Automatically pay your monthly rent on the scheduled lease due date.'}
                </p>
              </div>
            </div>

            {/* Multiple Lease Selector (if tenant has > 1 lease) */}
            {internalLeases.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
                  Lease:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {internalLeases.map((l) => (
                    <button
                      key={l._id}
                      type="button"
                      onClick={() => {
                        setSelectedLeaseId(l._id);
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className={cn(
                        'px-3 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1.5',
                        selectedLeaseId === l._id
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500 dark:text-emerald-300 shadow-sm font-black'
                          : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <span>{l.property?.name || 'Lease'}</span>
                      {l.status && (
                        <span className="text-[8px] uppercase tracking-wider opacity-60">
                          ({l.status})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Non-blocking API warning with retry if status fetch failed */}
            {loadError && (
              <div className="flex items-center gap-2 text-[11px] text-amber-500 pt-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{loadError}</span>
                <button
                  type="button"
                  onClick={fetchStatus}
                  className="underline hover:text-amber-400 font-bold ml-1 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* Right Details / CTA Column */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            {/* Rent & Schedule Info Box */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/80 text-left min-w-[240px] w-full sm:w-auto">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60">
                  Monthly Rent
                </p>
                <p className="text-xs font-black text-foreground truncate">
                  ₹{monthlyAmount.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60">
                  {isAutoPayActive ? 'Next Auto-Payment' : 'Next Payment Due'}
                </p>
                <p className="text-xs font-black text-emerald-500 truncate">
                  {loadingStatus ? '...' : nextDueDate}
                </p>
              </div>
            </div>

            {isAutoPayActive ? (
              <button
                type="button"
                onClick={handleOpenEnableModal}
                className="px-5 py-3 rounded-2xl border border-border/80 bg-muted/60 hover:bg-muted text-foreground text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-sm hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <span>Manage Auto-Pay</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenEnableModal}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto border border-white/20"
              >
                <Zap className="w-4 h-4" />
                <span>Enable Auto-Pay</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Auto-Pay Management / Enable Modal ── */}
      <AnimatePresence>
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (!submitting) setModalOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-3xl bg-card border border-border p-6 sm:p-8 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-2xl flex items-center justify-center border',
                      isAutoPayActive
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                    )}
                  >
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-wider text-foreground">
                      {isAutoPayActive ? 'Manage Auto-Pay' : 'Enable Rent Auto-Pay'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedLease?.property?.name || 'Your Residence'}
                    </p>
                  </div>
                </div>
                <button
                  disabled={submitting}
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 text-xs font-semibold flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Notice</p>
                    <p className="mt-0.5">{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {successMsg && (
                <div className="mb-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-xs font-semibold flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Modal Body */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-bold">Property</span>
                    <span className="font-black text-foreground">
                      {selectedLease?.property?.name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-bold">Monthly Rent</span>
                    <span className="font-black text-emerald-500 dark:text-emerald-400">
                      ₹{monthlyAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-bold">Next Scheduled Due</span>
                    <span className="font-black text-foreground">{nextDueDate}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-bold">Billing Cycle</span>
                    <span className="font-semibold text-foreground">
                      Monthly on Lease Anchor Date
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-muted-foreground space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Bank-Grade Recurring Mandate</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Auto-Pay sets up a verified Razorpay authorization mandate (UPI AutoPay / e-Mandate). Your bank will only be charged when rent is officially due. You can disable Auto-Pay at any time with 1 click.
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  {isAutoPayActive ? (
                    <>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setDisableConfirmOpen(true)}
                        className="w-full py-3.5 px-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer"
                      >
                        Disable Auto-Pay
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setModalOpen(false)}
                        className="w-full py-3.5 px-4 rounded-2xl bg-muted/60 hover:bg-muted text-foreground font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer border border-border"
                      >
                        Keep Active
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleEnableAutoPay}
                      className={cn(
                        'w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all duration-200 flex items-center justify-center gap-2 border border-white/20',
                        submitting ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'
                      )}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Opening Secure Authorization...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>Authorize & Enable Auto-Pay</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Disable Confirmation Dialog ── */}
      <AnimatePresence>
        {disableConfirmOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              if (!submitting) setDisableConfirmOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1.5">
                <h4 className="text-lg font-black text-foreground">Disable Auto-Pay?</h4>
                <p className="text-xs text-muted-foreground">
                  Your future automatic rent payments will be stopped. Existing payments and lease records will not be affected.
                </p>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setDisableConfirmOpen(false)}
                  className="py-3 px-4 rounded-2xl bg-muted/60 hover:bg-muted text-foreground text-xs font-black uppercase tracking-wider transition-colors border border-border cursor-pointer"
                >
                  Keep Auto-Pay
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleDisableAutoPay}
                  className="py-3 px-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-rose-500/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Disable Auto-Pay</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
