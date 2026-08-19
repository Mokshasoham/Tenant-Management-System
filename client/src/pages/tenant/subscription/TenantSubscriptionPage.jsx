import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Check,
  ShieldCheck,
  Building2,
  FileText,
  CreditCard,
  Zap,
  ArrowRight,
  HelpCircle,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
  Lock,
  Crown
} from 'lucide-react';
import { subscriptionService } from '../../../services/api';
import { useTheme } from '../../../context/ThemeContext';
import { cn } from '../../../utils/cn';

export default function TenantSubscriptionPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [upgradingPlanId, setUpgradingPlanId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  const fetchSubscriptionData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await subscriptionService.getMySubscription();
      const payload = res?.data?.data || res?.data;
      if (payload) {
        setSubData(payload);
        setPlans(payload.availablePlans || []);
      }
    } catch (err) {
      console.error('Error loading subscription data:', err);
      setErrorMessage('Failed to load subscription status. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  // Razorpay Checkout Handler for Tenant Upgrades
  const handleUpgrade = async (plan) => {
    if (plan.price === 0 || plan.planId === currentPlanId) return;

    setUpgradingPlanId(plan.planId);
    setErrorMessage(null);

    try {
      // 1. Create order on backend
      const orderRes = await subscriptionService.createOrder({
        planId: plan.planId,
        billingCycle,
      });

      const orderData = orderRes?.data?.data || orderRes?.data;
      if (!orderData?.orderId) {
        throw new Error('Could not initiate upgrade order.');
      }

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: orderData.keyId || 'rzp_test_SUn7uPXz1VaEa1',
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Tenant Management System',
        description: `Upgrade to ${orderData.planName} (${billingCycle})`,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            // 3. Verify signature on backend
            const verifyRes = await subscriptionService.verifyPayment({
              planId: plan.planId,
              billingCycle,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            setSuccessToast(`🎉 Successfully upgraded to ${plan.planName}!`);
            setTimeout(() => setSuccessToast(null), 5000);
            fetchSubscriptionData();
          } catch (vErr) {
            console.error('Payment verification error:', vErr);
            setErrorMessage(vErr?.response?.data?.message || 'Payment verification failed.');
          }
        },
        prefill: {
          name: 'Resident Tenant',
        },
        theme: {
          color: '#10b981',
        },
        modal: {
          ondismiss: () => {
            setUpgradingPlanId(null);
          },
        },
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Dynamic script loader fallback
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          const rzp = new window.Razorpay(options);
          rzp.open();
        };
        document.body.appendChild(script);
      }
    } catch (err) {
      console.error('Upgrade initiation error:', err);
      setErrorMessage(err?.response?.data?.message || err.message || 'Unable to initiate upgrade.');
    } finally {
      setUpgradingPlanId(null);
    }
  };

  const currentPlanId = subData?.subscription?.planId || 'free';
  const currentPlanName = subData?.subscription?.planName || 'TMS Resident Free';
  const usage = subData?.usage || { currentCount: 0, maxLimit: 2, isUnlimited: false, remainingSlots: 2 };

  // Calculate capacity percentage
  const capacityPercent = usage.isUnlimited
    ? 10
    : Math.min(100, Math.round((usage.currentCount / Math.max(1, usage.maxLimit)) * 100));

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-emerald-500/30">
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-200 shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold text-sm">{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header Banner */}
        <div className="relative rounded-[32px] bg-gradient-to-r from-[#061F1D] via-[#041416] to-[#020B0E] border border-emerald-500/30 p-6 sm:p-10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black tracking-widest uppercase">
                <Sparkles className="w-3 h-3" />
                <span>RESIDENT MEMBERSHIP</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Upgrade Your Resident Experience
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-medium leading-relaxed">
                Seamlessly manage multiple rental leases, unlock dedicated resident support, and access consolidated financial records.
              </p>
            </div>

            {/* Current Status Pill */}
            <div className="p-4 rounded-2xl bg-[#041918]/80 border border-emerald-500/30 flex items-center gap-4 shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-inner">
                <Crown className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Current Plan
                </span>
                <span className="text-base font-black text-white tracking-tight">
                  {currentPlanName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Lease Capacity Bar */}
        <div className="p-6 rounded-2xl bg-[#061318]/90 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                ACTIVE LEASE CAPACITY
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">
                ({usage.currentCount} / {usage.isUnlimited ? '∞ Unlimited' : `${usage.maxLimit} leases used`})
              </span>
            </div>

            {usage.isExceeded ? (
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Plan limit exceeded (Downgrade safety active)
              </span>
            ) : usage.isAtLimit ? (
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> You're at your plan limit
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-400">
                {usage.remainingSlots} lease slot{usage.remainingSlots > 1 ? 's' : ''} remaining
              </span>
            )}
          </div>

          {/* Progress Bar Container */}
          <div className="w-full h-3.5 rounded-full bg-slate-900 border border-slate-800 p-0.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${capacityPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn(
                "h-full rounded-full transition-all duration-500",
                usage.isExceeded
                  ? "bg-gradient-to-r from-amber-500 to-rose-500"
                  : usage.isAtLimit
                  ? "bg-gradient-to-r from-amber-500 to-orange-500"
                  : "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              )}
            />
          </div>

          {/* Warning Banner if exceeded */}
          {usage.warningMessage && (
            <p className="text-xs text-amber-300 font-medium pt-1">
              {usage.warningMessage}
            </p>
          )}
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 3 Large Interactive Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const isCurrent = plan.planId === currentPlanId;
            const isPlus = plan.planId === 'plus';
            const isPro = plan.planId === 'pro';

            return (
              <motion.div
                key={plan.planId}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "relative rounded-[28px] border p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-xl",
                  isCurrent
                    ? "bg-gradient-to-b from-[#08201D] to-[#041012] border-emerald-500/60 shadow-emerald-500/10 ring-1 ring-emerald-500/30"
                    : isPlus
                    ? "bg-gradient-to-b from-[#06181B] via-[#041014] to-[#02090D] border-emerald-500/40 hover:border-emerald-400 hover:shadow-emerald-500/20"
                    : "bg-gradient-to-b from-[#0B1728] via-[#060E1A] to-[#03070E] border-slate-800 hover:border-slate-700"
                )}
              >
                {/* Popular / Best Value Badge */}
                {plan.badge && !isCurrent && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span
                      className={cn(
                        "px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg border",
                        isPro
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400 shadow-amber-500/20"
                          : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-400 shadow-emerald-500/20"
                      )}
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Card Title & Lease Cap */}
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight uppercase">
                      {plan.planName}
                    </h3>
                    <p className="text-xs font-bold text-emerald-400 mt-0.5">
                      {plan.maxLeases >= 999999 ? 'Unlimited Leases (5+)' : `Up to ${plan.maxLeases} Leases`}
                    </p>
                  </div>

                  {/* Pricing Header */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      ₹{plan.price}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">/ month</span>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2.5 border-t border-slate-800/80 pt-5">
                    {plan.features?.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="font-medium text-slate-300">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Action Button */}
                <div className="pt-8">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-black text-xs uppercase tracking-wider cursor-default flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Current Plan</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={upgradingPlanId === plan.planId}
                      onClick={() => handleUpgrade(plan)}
                      className={cn(
                        "w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
                        isPro
                          ? "bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-amber-500/25"
                          : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25"
                      )}
                    >
                      {upgradingPlanId === plan.planId ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>Upgrade to {plan.planId.toUpperCase()}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Plan Comparison Section */}
        <div className="rounded-[28px] bg-[#050E17]/80 border border-slate-800 p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">
              Compare Plan Features
            </h3>
            <p className="text-xs text-slate-400">
              Detailed breakdown of capacity and features across all Resident tiers.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Feature</th>
                  <th className="py-3 px-4 text-center">FREE</th>
                  <th className="py-3 px-4 text-center text-emerald-400">PLUS</th>
                  <th className="py-3 px-4 text-center text-amber-400">PRO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-white">Active Leases</td>
                  <td className="py-3.5 px-4 text-center font-mono">2</td>
                  <td className="py-3.5 px-4 text-center font-mono text-emerald-400 font-bold">4</td>
                  <td className="py-3.5 px-4 text-center font-mono text-amber-400 font-bold">Unlimited (5+)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Rent Payments &amp; Receipts</td>
                  <td className="py-3.5 px-4 text-center text-emerald-400">✓</td>
                  <td className="py-3.5 px-4 text-center text-emerald-400">✓</td>
                  <td className="py-3.5 px-4 text-center text-emerald-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Utility Invoices &amp; Bills</td>
                  <td className="py-3.5 px-4 text-center text-emerald-400">✓</td>
                  <td className="py-3.5 px-4 text-center text-emerald-400">✓</td>
                  <td className="py-3.5 px-4 text-center text-emerald-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Direct Landlord Messaging</td>
                  <td className="py-3.5 px-4 text-center text-emerald-400">✓</td>
                  <td className="py-3.5 px-4 text-center text-emerald-400">✓</td>
                  <td className="py-3.5 px-4 text-center text-emerald-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Advanced Tax &amp; Expense Reports</td>
                  <td className="py-3.5 px-4 text-center text-slate-600">—</td>
                  <td className="py-3.5 px-4 text-center text-emerald-400">✓</td>
                  <td className="py-3.5 px-4 text-center text-emerald-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Priority Resident Support</td>
                  <td className="py-3.5 px-4 text-center text-slate-600">—</td>
                  <td className="py-3.5 px-4 text-center text-emerald-400">✓</td>
                  <td className="py-3.5 px-4 text-center text-emerald-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Lifetime Document Vault &amp; Early Access</td>
                  <td className="py-3.5 px-4 text-center text-slate-600">—</td>
                  <td className="py-3.5 px-4 text-center text-slate-600">—</td>
                  <td className="py-3.5 px-4 text-center text-amber-400 font-bold">✓ (VIP)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
