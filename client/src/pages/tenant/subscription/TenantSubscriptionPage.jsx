import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Check,
  Building2,
  FileText,
  CreditCard,
  Zap,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
  Crown,
  Home,
  ShieldCheck,
  Clock,
  Layers,
  RefreshCw,
  Award,
  HelpCircle,
  FileCheck,
  TrendingUp,
  FolderLock
} from 'lucide-react';
import { subscriptionService } from '../../../services/api';
import { useTheme } from '../../../context/ThemeContext';
import { cn } from '../../../utils/cn';

// Default static fallback plans to ensure UI is NEVER empty even during network outages
const FALLBACK_TENANT_PLANS = [
  {
    planId: 'free',
    planName: 'Resident Free',
    description: 'For individual renters & single residences',
    price: 0,
    maxLeases: 2,
    badge: 'CURRENT PLAN',
    features: [
      'Manage up to 2 active leases',
      'Rent payments & receipts',
      'Utility invoices & bills',
      'Direct landlord messaging',
      'Basic resident dashboard',
    ],
  },
  {
    planId: 'plus',
    planName: 'Resident Plus',
    description: 'For residents managing multiple homes',
    price: 499,
    maxLeases: 4,
    badge: 'MOST POPULAR',
    features: [
      'Manage up to 4 active leases',
      'Rent payments & receipts',
      'Utility invoices & bills',
      'Direct landlord messaging',
      'Advanced tax & expense reports',
      'Priority resident support',
    ],
  },
  {
    planId: 'pro',
    planName: 'Resident Pro',
    description: 'For comprehensive multi-property residents',
    price: 999,
    maxLeases: 999999,
    badge: 'BEST VALUE',
    features: [
      'Unlimited active leases (5+)',
      'Rent payments & receipts',
      'Utility invoices & bills',
      'Direct landlord messaging',
      'Advanced tax & expense reports',
      'Priority resident support',
      'Lifetime document vault',
      'Early access to premium features',
    ],
  },
];

export default function TenantSubscriptionPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [subData, setSubData] = useState(null);
  const [plans, setPlans] = useState(FALLBACK_TENANT_PLANS);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [upgradingPlanId, setUpgradingPlanId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Robust subscription data fetching with graceful fallbacks
  const fetchSubscriptionData = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    else setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Fetch authenticated user subscription
      const res = await subscriptionService.getMySubscription();
      
      // Handle various response wrappers cleanly
      const payload = res?.data?.data || res?.data || res;

      if (payload && (payload.subscription || payload.usage)) {
        setSubData(payload);

        // If backend returned availablePlans, use them; otherwise keep/fetch
        if (payload.availablePlans && Array.isArray(payload.availablePlans) && payload.availablePlans.length > 0) {
          setPlans(payload.availablePlans);
        } else {
          // Attempt fallback fetch to /plans
          try {
            const plansRes = await subscriptionService.getPlans('tenant');
            const planList = plansRes?.data?.data || plansRes?.data || plansRes;
            if (Array.isArray(planList) && planList.length > 0) {
              setPlans(planList);
            }
          } catch (pErr) {
            console.warn('[TenantSubscription] Using fallback plans config:', pErr);
          }
        }
      } else {
        // Fallback default state for new first-time tenant
        setSubData({
          subscription: {
            planId: 'free',
            planName: 'Resident Free',
            status: 'active',
            price: 0,
            billingCycle: 'monthly',
            maxLeases: 2,
            startedAt: new Date(),
            expiresAt: null,
            autoRenew: true,
          },
          usage: {
            currentCount: 0,
            maxLimit: 2,
            isUnlimited: false,
            remainingSlots: 2,
            isAtLimit: false,
            isExceeded: false,
          },
          availablePlans: FALLBACK_TENANT_PLANS,
        });
      }
    } catch (err) {
      console.warn('[TenantSubscription] Subscription fetch issue, initializing resilient fallback:', err);
      
      // Default to Resident Free if network or endpoint was unavailable
      setSubData((prev) => prev || {
        subscription: {
          planId: 'free',
          planName: 'Resident Free',
          status: 'active',
          price: 0,
          billingCycle: 'monthly',
          maxLeases: 2,
          startedAt: new Date(),
          expiresAt: null,
          autoRenew: true,
        },
        usage: {
          currentCount: 0,
          maxLimit: 2,
          isUnlimited: false,
          remainingSlots: 2,
          isAtLimit: false,
          isExceeded: false,
        },
        availablePlans: FALLBACK_TENANT_PLANS,
      });

      // Non-blocking user warning with retry action
      setErrorMessage('Subscription live status sync is temporary unavailable. Displaying local plan defaults.');
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  // Razorpay Upgrade Flow
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

      const orderData = orderRes?.data?.data || orderRes?.data || orderRes;
      if (!orderData?.orderId) {
        throw new Error('Could not initiate upgrade order.');
      }

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: orderData.keyId || 'rzp_test_SUn7uPXz1VaEa1',
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Tenant Management System',
        description: `Upgrade to ${orderData.planName || plan.planName} (${billingCycle})`,
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
            setErrorMessage(vErr?.message || 'Payment verification failed. Please check with support.');
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
      setErrorMessage(err?.message || 'Unable to initiate upgrade. Please try again.');
    } finally {
      setUpgradingPlanId(null);
    }
  };

  const currentPlanId = subData?.subscription?.planId || 'free';
  const currentPlanName = subData?.subscription?.planName || 'Resident Free';
  const usage = subData?.usage || { currentCount: 0, maxLimit: 2, isUnlimited: false, remainingSlots: 2 };

  // Calculate capacity percentage for progress bar
  const capacityPercent = usage.isUnlimited
    ? 15
    : Math.min(100, Math.round((usage.currentCount / Math.max(1, usage.maxLimit)) * 100));

  const planIcons = {
    free: Home,
    plus: Sparkles,
    pro: Crown,
  };

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
        {/* Navigation Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK</span>
          </button>
        </div>

        {/* ── Top Header Banner ── */}
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
                Choose the plan that fits the way you live, manage, and grow your rental portfolio.
              </p>
            </div>

            {/* Current Status Card on Right */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#041918]/85 border border-emerald-500/30 flex items-center gap-4 shrink-0 shadow-lg">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-inner">
                <Crown className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  CURRENT PLAN
                </span>
                <span className="text-base font-black text-white tracking-tight block">
                  {currentPlanName}
                </span>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[11px] font-bold text-slate-400">
                    {usage.isUnlimited ? 'Unlimited leases' : `${usage.maxLimit} lease capacity`}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black tracking-wide border border-emerald-500/30">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Live Lease Capacity Bar ── */}
        <div className="p-6 rounded-2xl bg-[#061318]/90 border border-slate-800 space-y-3 shadow-md">
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

          {/* Animated Progress Bar */}
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

        {/* Soft Non-blocking Retry Banner if error */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => fetchSubscriptionData(true)}
              disabled={retrying}
              className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-black uppercase flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {retrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* ── THREE LARGE PREMIUM PLAN CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const isCurrent = plan.planId === currentPlanId;
            const isPlus = plan.planId === 'plus';
            const isPro = plan.planId === 'pro';
            const PlanIcon = planIcons[plan.planId] || Home;

            return (
              <motion.div
                key={plan.planId}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "relative rounded-[30px] border p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-2xl",
                  isPlus
                    ? "bg-gradient-to-b from-[#072421] via-[#041618] to-[#020A0D] border-emerald-400/60 shadow-[0_15px_40px_-10px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/40 md:-translate-y-2"
                    : isPro
                    ? "bg-gradient-to-b from-[#08222C] via-[#04131C] to-[#02090F] border-cyan-500/40 hover:border-cyan-400/60 shadow-xl"
                    : "bg-gradient-to-b from-[#0A161E] via-[#050E14] to-[#02060A] border-slate-800 hover:border-slate-700 shadow-lg"
                )}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span
                      className={cn(
                        "px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg border",
                        isCurrent
                          ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                          : isPlus
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-300 shadow-emerald-500/30"
                          : "bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-cyan-300 shadow-cyan-500/30"
                      )}
                    >
                      {isCurrent ? 'CURRENT PLAN' : plan.badge}
                    </span>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Header: Icon + Title + Description */}
                  <div className="space-y-3">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner",
                        isPlus
                          ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                          : isPro
                          ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300"
                          : "bg-slate-800/60 border-slate-700 text-slate-300"
                      )}
                    >
                      <PlanIcon className="w-6 h-6 stroke-[2.2]" />
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight uppercase">
                        {plan.planName}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium mt-1">
                        {plan.description || (isPlus ? 'For residents managing multiple homes' : isPro ? 'For comprehensive multi-property residents' : 'For individual renters & single residences')}
                      </p>
                    </div>
                  </div>

                  {/* Pricing Display */}
                  <div className="flex items-baseline gap-1.5 pb-2">
                    <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                      ₹{plan.price}
                    </span>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      / month
                    </span>
                  </div>

                  {/* Lease Capacity Indicator Box */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/90 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <span>LEASE CAPACITY</span>
                      <span className={isPlus ? 'text-emerald-400' : isPro ? 'text-cyan-400' : 'text-slate-300'}>
                        {plan.maxLeases >= 999999 ? 'Unlimited (5+)' : `${plan.maxLeases} Leases`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="text-xs font-bold text-slate-200">
                        {plan.maxLeases >= 999999 ? 'Unlimited active leases (5+)' : `Up to ${plan.maxLeases} active leases`}
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          isPro
                            ? "w-full bg-gradient-to-r from-cyan-400 to-teal-400"
                            : isPlus
                            ? "w-3/4 bg-gradient-to-r from-emerald-400 to-teal-400"
                            : "w-2/5 bg-slate-600"
                        )}
                      />
                    </div>
                  </div>

                  {/* Feature List */}
                  <div className="space-y-3 pt-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      INCLUDED FEATURES
                    </span>

                    <div className="space-y-2.5">
                      {plan.features?.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                          <div
                            className={cn(
                              "w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 border",
                              isPlus
                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                : isPro
                                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                                : "bg-slate-800 border-slate-700 text-slate-400"
                            )}
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span className="font-medium text-slate-300 leading-tight">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CTA Action Button */}
                <div className="pt-8">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-black text-xs uppercase tracking-wider cursor-default flex items-center justify-center gap-2 shadow-inner"
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
                        "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
                        isPlus
                          ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/30"
                          : isPro
                          ? "bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-600 hover:from-cyan-400 hover:to-teal-500 text-white shadow-cyan-500/30"
                          : "bg-slate-800 hover:bg-slate-700 text-white"
                      )}
                    >
                      {upgradingPlanId === plan.planId ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>Upgrade to {plan.planId === 'plus' ? 'Plus' : 'Pro'}</span>
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

        {/* ── WHY UPGRADE? BENEFITS STRIP ── */}
        <div className="p-6 sm:p-8 rounded-[28px] bg-slate-950/80 border border-slate-800 space-y-5 shadow-lg">
          <div>
            <h3 className="text-base font-black text-white tracking-tight uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Why Upgrade?</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Maximize your rental flexibility with enterprise-grade resident tools.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400">
                <Building2 className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Multiple Leases
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                Manage more rental properties simultaneously from one consolidated account.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-teal-400">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Priority Support
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                Get accelerated resolution and direct staff assistance when you need it.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-cyan-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Advanced Insights
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                Access rich payment analytics, expense charts, and tax-ready PDF exports.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400">
                <FolderLock className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Secure Documents
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                Permanent encrypted vault for all your lease agreements, bills, and receipts.
              </p>
            </div>
          </div>
        </div>

        {/* ── COMPARISON TABLE ── */}
        <div className="rounded-[28px] bg-[#050E17]/85 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl">
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
                  <th className={cn("py-3 px-4 text-center", currentPlanId === 'free' && "bg-emerald-500/10 text-emerald-300 rounded-t-xl")}>
                    FREE
                  </th>
                  <th className={cn("py-3 px-4 text-center text-emerald-400", currentPlanId === 'plus' && "bg-emerald-500/15 font-bold rounded-t-xl")}>
                    PLUS
                  </th>
                  <th className={cn("py-3 px-4 text-center text-cyan-400", currentPlanId === 'pro' && "bg-cyan-500/15 font-bold rounded-t-xl")}>
                    PRO
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-white">Active Leases</td>
                  <td className={cn("py-3.5 px-4 text-center font-mono", currentPlanId === 'free' && "bg-emerald-500/5 font-bold text-white")}>
                    2
                  </td>
                  <td className={cn("py-3.5 px-4 text-center font-mono text-emerald-400 font-bold", currentPlanId === 'plus' && "bg-emerald-500/10")}>
                    4
                  </td>
                  <td className={cn("py-3.5 px-4 text-center font-mono text-cyan-400 font-bold", currentPlanId === 'pro' && "bg-cyan-500/10")}>
                    Unlimited (5+)
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Rent Payments &amp; Receipts</td>
                  <td className={cn("py-3.5 px-4 text-center text-emerald-400", currentPlanId === 'free' && "bg-emerald-500/5")}>✓</td>
                  <td className={cn("py-3.5 px-4 text-center text-emerald-400", currentPlanId === 'plus' && "bg-emerald-500/10")}>✓</td>
                  <td className={cn("py-3.5 px-4 text-center text-emerald-400", currentPlanId === 'pro' && "bg-cyan-500/10")}>✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Utility Invoices &amp; Bills</td>
                  <td className={cn("py-3.5 px-4 text-center text-emerald-400", currentPlanId === 'free' && "bg-emerald-500/5")}>✓</td>
                  <td className={cn("py-3.5 px-4 text-center text-emerald-400", currentPlanId === 'plus' && "bg-emerald-500/10")}>✓</td>
                  <td className={cn("py-3.5 px-4 text-center text-emerald-400", currentPlanId === 'pro' && "bg-cyan-500/10")}>✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Direct Landlord Messaging</td>
                  <td className={cn("py-3.5 px-4 text-center text-emerald-400", currentPlanId === 'free' && "bg-emerald-500/5")}>✓</td>
                  <td className={cn("py-3.5 px-4 text-center text-emerald-400", currentPlanId === 'plus' && "bg-emerald-500/10")}>✓</td>
                  <td className={cn("py-3.5 px-4 text-center text-emerald-400", currentPlanId === 'pro' && "bg-cyan-500/10")}>✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Advanced Tax &amp; Expense Reports</td>
                  <td className={cn("py-3.5 px-4 text-center text-slate-600", currentPlanId === 'free' && "bg-emerald-500/5")}>—</td>
                  <td className={cn("py-3.5 px-4 text-center text-emerald-400", currentPlanId === 'plus' && "bg-emerald-500/10")}>✓</td>
                  <td className={cn("py-3.5 px-4 text-center text-emerald-400", currentPlanId === 'pro' && "bg-cyan-500/10")}>✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Priority Resident Support</td>
                  <td className={cn("py-3.5 px-4 text-center text-slate-600", currentPlanId === 'free' && "bg-emerald-500/5")}>—</td>
                  <td className={cn("py-3.5 px-4 text-center text-emerald-400", currentPlanId === 'plus' && "bg-emerald-500/10")}>✓</td>
                  <td className={cn("py-3.5 px-4 text-center text-emerald-400", currentPlanId === 'pro' && "bg-cyan-500/10")}>✓</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4">Lifetime Document Vault &amp; Early Access</td>
                  <td className={cn("py-3.5 px-4 text-center text-slate-600", currentPlanId === 'free' && "bg-emerald-500/5")}>—</td>
                  <td className={cn("py-3.5 px-4 text-center text-slate-600", currentPlanId === 'plus' && "bg-emerald-500/10")}>—</td>
                  <td className={cn("py-3.5 px-4 text-center text-cyan-300 font-bold", currentPlanId === 'pro' && "bg-cyan-500/10")}>✓ (VIP)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
