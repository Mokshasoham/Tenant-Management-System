import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Check,
  Building2,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  Zap,
  ArrowRight,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
  Lock,
  Briefcase
} from 'lucide-react';
import { subscriptionService } from '../../../services/api';
import { useTheme } from '../../../context/ThemeContext';
import { cn } from '../../../utils/cn';

export default function ManagerSubscriptionPage() {
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
      console.error('Error loading manager subscription:', err);
      setErrorMessage('Failed to load subscription status. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  // Razorpay Checkout Handler for Manager Upgrades
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
            await subscriptionService.verifyPayment({
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
          name: 'Property Manager',
        },
        theme: {
          color: '#6366f1',
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

  const currentPlanId = subData?.subscription?.planId || 'starter';
  const currentPlanName = subData?.subscription?.planName || 'TMS Manager Starter';
  const usage = subData?.usage || { currentCount: 0, maxLimit: 3, isUnlimited: false, remainingSlots: 3 };

  // Calculate capacity percentage
  const capacityPercent = usage.isUnlimited
    ? 10
    : Math.min(100, Math.round((usage.currentCount / Math.max(1, usage.maxLimit)) * 100));

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-indigo-500/30">
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-indigo-950 border border-indigo-500/40 text-indigo-200 shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
            <span className="font-bold text-sm">{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header Banner */}
        <div className="relative rounded-[32px] bg-gradient-to-r from-[#0C1533] via-[#080E24] to-[#040714] border border-indigo-500/30 p-6 sm:p-10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[10px] font-black tracking-widest uppercase">
                <Briefcase className="w-3 h-3" />
                <span>PORTFOLIO SCALING &amp; OPERATIONS</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Scale Your Property Operations
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-medium leading-relaxed">
                Expand your property portfolio capacity, unlock enterprise revenue analytics, and coordinate multi-tenant maintenance at scale.
              </p>
            </div>

            {/* Current Status Pill */}
            <div className="p-4 rounded-2xl bg-[#070D22]/90 border border-indigo-500/30 flex items-center gap-4 shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shadow-inner">
                <Building2 className="w-6 h-6 stroke-[2.2]" />
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

        {/* Live Property Capacity Bar */}
        <div className="p-6 rounded-2xl bg-[#060C1F]/90 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                PROPERTY PORTFOLIO CAPACITY
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">
                ({usage.currentCount} / {usage.isUnlimited ? '∞ Unlimited' : `${usage.maxLimit} properties used`})
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
              <span className="text-xs font-bold text-indigo-400">
                {usage.remainingSlots} property slot{usage.remainingSlots > 1 ? 's' : ''} remaining
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
                  : "bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
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
                    ? "bg-gradient-to-b from-[#0F1B3E] to-[#070D1F] border-indigo-500/60 shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                    : isPlus
                    ? "bg-gradient-to-b from-[#0C1738] via-[#080E24] to-[#040816] border-indigo-500/40 hover:border-indigo-400 hover:shadow-indigo-500/20"
                    : "bg-gradient-to-b from-[#0E1528] via-[#080D1A] to-[#03060E] border-slate-800 hover:border-slate-700"
                )}
              >
                {/* Popular / Best Value Badge */}
                {plan.badge && !isCurrent && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span
                      className={cn(
                        "px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg border",
                        isPro
                          ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white border-blue-400 shadow-indigo-500/25"
                          : "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white border-indigo-400 shadow-indigo-500/20"
                      )}
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Card Title & Property Cap */}
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight uppercase">
                      {plan.planName}
                    </h3>
                    <p className="text-xs font-bold text-indigo-400 mt-0.5">
                      {plan.maxProperties >= 999999 ? 'Unlimited Properties (6+)' : `Up to ${plan.maxProperties} Properties`}
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
                        <div className="w-4 h-4 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
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
                      className="w-full py-3.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-black text-xs uppercase tracking-wider cursor-default flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
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
                          ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-indigo-500/25"
                          : "bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white shadow-indigo-500/25"
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
        <div className="rounded-[28px] bg-[#060C1E]/80 border border-slate-800 p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">
              Compare Manager Plan Features
            </h3>
            <p className="text-xs text-slate-400">
              Detailed breakdown of portfolio capacity and operations across all Manager tiers.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Feature</th>
                  <th className="py-3 px-4 text-center">STARTER</th>
                  <th className="py-3 px-4 text-center text-indigo-400">PLUS</th>
                  <th className="py-3 px-4 text-center text-cyan-400">PRO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-white">Properties Managed</td>
                  <td className="py-3.5 px-4 text-center font-mono">3</td>
                  <td className="py-3.5 px-4 text-center font-mono text-indigo-400 font-bold">5</td>
                  <td className="py-3.5 px-4 text-center font-mono text-cyan-400 font-bold">Unlimited (6+)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Tenant &amp; Lease Directory</td>
                  <td className="py-3.5 px-4 text-center text-indigo-400">✓</td>
                  <td className="py-3.5 px-4 text-center text-indigo-400">✓</td>
                  <td className="py-3.5 px-4 text-center text-indigo-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Maintenance Ticket Dispatch</td>
                  <td className="py-3.5 px-4 text-center text-indigo-400">✓</td>
                  <td className="py-3.5 px-4 text-center text-indigo-400">✓</td>
                  <td className="py-3.5 px-4 text-center text-indigo-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Financial &amp; Revenue Analytics</td>
                  <td className="py-3.5 px-4 text-center text-slate-600">—</td>
                  <td className="py-3.5 px-4 text-center text-indigo-400">✓</td>
                  <td className="py-3.5 px-4 text-center text-indigo-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Enhanced PDF &amp; CSV Audit Exports</td>
                  <td className="py-3.5 px-4 text-center text-slate-600">—</td>
                  <td className="py-3.5 px-4 text-center text-indigo-400">✓</td>
                  <td className="py-3.5 px-4 text-center text-indigo-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Priority Support &amp; Dispatch Assistance</td>
                  <td className="py-3.5 px-4 text-center text-slate-600">—</td>
                  <td className="py-3.5 px-4 text-center text-indigo-400">✓</td>
                  <td className="py-3.5 px-4 text-center text-indigo-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Enterprise Multi-Manager Delegation &amp; API Access</td>
                  <td className="py-3.5 px-4 text-center text-slate-600">—</td>
                  <td className="py-3.5 px-4 text-center text-slate-600">—</td>
                  <td className="py-3.5 px-4 text-center text-cyan-400 font-bold">✓ (Enterprise)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
