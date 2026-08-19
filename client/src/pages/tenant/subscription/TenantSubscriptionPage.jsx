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
  FolderLock,
  MessageSquare
} from 'lucide-react';
import { subscriptionService, leaseService } from '../../../services/api';
import { useTheme } from '../../../context/ThemeContext';
import { cn } from '../../../utils/cn';

// Authoritative fallback plans (Resident Free: 2 leases, Resident Plus: 4 leases, Resident Pro: Unlimited)
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
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [subData, setSubData] = useState(null);
  const [plans, setPlans] = useState(FALLBACK_TENANT_PLANS);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [upgradingPlanId, setUpgradingPlanId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Synchronized subscription & active lease usage fetcher
  const fetchSubscriptionData = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    else setLoading(true);
    setErrorMessage(null);

    try {
      // Parallel fetch subscription state and real lease records for guaranteed active count
      const [subRes, leaseRes] = await Promise.allSettled([
        subscriptionService.getMySubscription(),
        leaseService.getMyLease(),
      ]);

      let payload = null;
      if (subRes.status === 'fulfilled') {
        const raw = subRes.value;
        payload = raw?.data?.data || raw?.data || raw;
      }

      // Count strictly ACTIVE leases from lease service (house = ACTIVE, moksha's apartment = UPCOMING)
      let directActiveLeaseCount = 0;
      if (leaseRes.status === 'fulfilled') {
        const leasePayload = leaseRes.value;
        const activeLeaseList = leasePayload?.activeLeases || (leasePayload?.data ? [leasePayload.data] : []);
        directActiveLeaseCount = activeLeaseList.filter(
          (l) => (l.status || '').toLowerCase() === 'active'
        ).length;
      }

      const activePlanId = (payload?.subscription?.planId || payload?.subscription?.plan || 'free').toLowerCase();
      const currentPlanLimit = activePlanId === 'plus' ? 4 : (activePlanId === 'pro' ? 999999 : 2);
      
      const backendCount = payload?.usage?.activeLeases ?? payload?.usage?.currentCount ?? 0;
      const finalActiveCount = Math.max(backendCount, directActiveLeaseCount);
      const isUnlimited = currentPlanLimit >= 999999;
      const remainingSlots = isUnlimited ? 999999 : Math.max(0, currentPlanLimit - finalActiveCount);
      const percentage = isUnlimited ? 100 : Math.min(100, Math.round((finalActiveCount / Math.max(1, currentPlanLimit)) * 100));

      const normalizedData = {
        subscription: {
          planId: activePlanId,
          planName: activePlanId === 'plus' ? 'Resident Plus' : (activePlanId === 'pro' ? 'Resident Pro' : 'Resident Free'),
          status: payload?.subscription?.status || 'active',
          price: activePlanId === 'free' ? 0 : (payload?.subscription?.price || (activePlanId === 'plus' ? 499 : 999)),
          billingCycle: payload?.subscription?.billingCycle || 'monthly',
          maxLeases: currentPlanLimit,
          startedAt: payload?.subscription?.startedAt || new Date(),
          expiresAt: payload?.subscription?.expiresAt || null,
        },
        usage: {
          currentCount: finalActiveCount,
          activeLeases: finalActiveCount,
          maxLimit: currentPlanLimit,
          maxLeases: currentPlanLimit,
          isUnlimited,
          remainingSlots,
          remainingLeases: remainingSlots,
          percentage,
          isAtLimit: !isUnlimited && finalActiveCount >= currentPlanLimit,
          isExceeded: !isUnlimited && finalActiveCount > currentPlanLimit,
        },
        availablePlans: FALLBACK_TENANT_PLANS,
      };

      setSubData(normalizedData);

      if (payload?.availablePlans && Array.isArray(payload.availablePlans) && payload.availablePlans.length > 0) {
        const mappedPlans = payload.availablePlans.map((p) => {
          const pId = (p.planId || '').toLowerCase();
          return {
            ...p,
            planId: pId,
            planName: pId === 'plus' ? 'Resident Plus' : (pId === 'pro' ? 'Resident Pro' : 'Resident Free'),
            maxLeases: pId === 'plus' ? 4 : (pId === 'pro' ? 999999 : 2),
            price: pId === 'free' ? 0 : (p.price || (pId === 'plus' ? 499 : 999)),
            badge: pId === 'plus' ? 'MOST POPULAR' : (pId === 'pro' ? 'BEST VALUE' : 'CURRENT PLAN'),
          };
        });
        setPlans(mappedPlans);
      } else {
        setPlans(FALLBACK_TENANT_PLANS);
      }
    } catch (err) {
      console.warn('[TenantSubscription] Fallback hydration applied:', err);
      setSubData({
        subscription: {
          planId: 'free',
          planName: 'Resident Free',
          status: 'active',
          price: 0,
          billingCycle: 'monthly',
          maxLeases: 2,
        },
        usage: {
          currentCount: 1,
          activeLeases: 1,
          maxLimit: 2,
          maxLeases: 2,
          isUnlimited: false,
          remainingSlots: 1,
          percentage: 50,
          isAtLimit: false,
          isExceeded: false,
        },
        availablePlans: FALLBACK_TENANT_PLANS,
      });
      setErrorMessage('Live subscription sync is currently offline. Displaying local plan defaults.');
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  // Razorpay Upgrade Handler
  const handleUpgrade = async (plan) => {
    if (plan.price === 0 || plan.planId === currentPlanId) return;

    setUpgradingPlanId(plan.planId);
    setErrorMessage(null);

    try {
      const orderRes = await subscriptionService.createOrder({
        planId: plan.planId,
        billingCycle,
      });

      const orderData = orderRes?.data?.data || orderRes?.data || orderRes;
      if (!orderData?.orderId) {
        throw new Error('Could not initiate upgrade order.');
      }

      const options = {
        key: orderData.keyId || 'rzp_test_SUn7uPXz1VaEa1',
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Tenant Management System',
        description: `Upgrade to ${orderData.planName || plan.planName} (${billingCycle})`,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
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

  const currentPlanId = (subData?.subscription?.planId || 'free').toLowerCase();
  const currentPlanName = subData?.subscription?.planName || 'Resident Free';
  const usage = subData?.usage || { currentCount: 1, maxLimit: 2, isUnlimited: false, remainingSlots: 1, percentage: 50 };
  const currentCount = usage.currentCount ?? 1;
  const maxLimit = usage.isUnlimited ? 999999 : (usage.maxLimit || 2);
  const remainingSlots = usage.isUnlimited ? 999999 : (usage.remainingSlots ?? Math.max(0, maxLimit - currentCount));
  const capacityPercent = usage.isUnlimited ? 100 : (usage.percentage ?? Math.min(100, Math.round((currentCount / Math.max(1, maxLimit)) * 100)));

  const planIcons = {
    free: Home,
    plus: Sparkles,
    pro: Crown,
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300 p-4 sm:p-6 lg:p-8 font-sans",
      isDark ? "bg-[#030712] text-slate-100 selection:bg-emerald-500/30" : "bg-transparent text-slate-900 selection:bg-emerald-500/20"
    )}>
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed top-6 right-6 z-50 p-4 rounded-2xl border shadow-2xl flex items-center gap-3",
              isDark ? "bg-emerald-950 border-emerald-500/40 text-emerald-200" : "bg-white border-emerald-300 text-emerald-900 shadow-emerald-500/10"
            )}
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="font-bold text-sm">{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm",
              isDark
                ? "bg-slate-900/80 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 shadow-slate-200/50"
            )}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK</span>
          </button>
        </div>

        {/* ── Top Header Banner ── */}
        <div className={cn(
          "relative rounded-[32px] border p-6 sm:p-10 overflow-hidden transition-all duration-300",
          isDark
            ? "bg-gradient-to-r from-[#061F1D] via-[#041416] to-[#020B0E] border-emerald-500/30 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)]"
            : "bg-gradient-to-r from-emerald-50/95 via-teal-50/90 to-white border-emerald-200 shadow-[0_15px_35px_-10px_rgba(16,185,129,0.12)]"
        )}>
          <div className={cn(
            "absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none",
            isDark ? "bg-emerald-500/10" : "bg-emerald-400/15"
          )} />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black tracking-widest uppercase shadow-sm",
                isDark ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-800"
              )}>
                <Sparkles className="w-3 h-3 text-emerald-500" />
                <span>RESIDENT MEMBERSHIP</span>
              </div>
              <h1 className={cn(
                "text-2xl sm:text-4xl font-black tracking-tight",
                isDark ? "text-white" : "text-slate-900"
              )}>
                Upgrade Your Resident Experience
              </h1>
              <p className={cn(
                "text-xs sm:text-sm max-w-xl font-medium leading-relaxed",
                isDark ? "text-slate-300" : "text-slate-600"
              )}>
                Choose the plan that fits the way you live, manage, and grow your rental portfolio.
              </p>
            </div>

            {/* Current Status Card on Right */}
            <div className={cn(
              "p-4 sm:p-5 rounded-2xl border flex items-center gap-4 shrink-0 shadow-lg",
              isDark ? "bg-[#041918]/85 border-emerald-500/30" : "bg-white/95 border-emerald-200 shadow-emerald-500/5"
            )}>
              <div className={cn(
                "w-12 h-12 rounded-2xl border flex items-center justify-center shadow-inner",
                isDark ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-700"
              )}>
                <Crown className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="space-y-0.5">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider block",
                  isDark ? "text-slate-400" : "text-slate-500"
                )}>
                  CURRENT PLAN
                </span>
                <span className={cn(
                  "text-base font-black tracking-tight block",
                  isDark ? "text-white" : "text-slate-900"
                )}>
                  {currentPlanName}
                </span>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className={cn(
                    "text-[11px] font-bold",
                    isDark ? "text-slate-400" : "text-slate-600"
                  )}>
                    {usage.isUnlimited ? 'Unlimited leases' : `${maxLimit} lease capacity`}
                  </span>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.2 rounded-full text-[9px] font-black tracking-wide border",
                    isDark ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-emerald-100 text-emerald-800 border-emerald-300"
                  )}>
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Live Active Lease Capacity Bar ── */}
        <div className={cn(
          "p-6 rounded-2xl border space-y-3 shadow-md transition-all duration-300",
          isDark ? "bg-[#061318]/90 border-slate-800" : "bg-white border-slate-200 shadow-slate-100"
        )}>
          {loading ? (
            <div className="space-y-3 py-2 animate-pulse">
              <div className="flex items-center justify-between">
                <div className={cn("h-4 w-48 rounded", isDark ? "bg-slate-800" : "bg-slate-200")} />
                <div className={cn("h-4 w-32 rounded", isDark ? "bg-slate-800" : "bg-slate-200")} />
              </div>
              <div className={cn("h-3.5 w-full rounded-full", isDark ? "bg-slate-900" : "bg-slate-100")} />
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                  <span className={cn(
                    "text-xs font-black uppercase tracking-wider",
                    isDark ? "text-slate-200" : "text-slate-800"
                  )}>
                    ACTIVE LEASE CAPACITY
                  </span>
                  <span className={cn(
                    "text-xs font-mono font-bold",
                    isDark ? "text-slate-400" : "text-slate-500"
                  )}>
                    ({currentCount} / {usage.isUnlimited ? '∞ Unlimited' : `${maxLimit} leases used`})
                  </span>
                </div>

                {usage.isExceeded ? (
                  <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Plan limit exceeded (Downgrade safety active)
                  </span>
                ) : usage.isAtLimit ? (
                  <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> 0 lease slots remaining (Limit reached)
                  </span>
                ) : (
                  <span className={cn("text-xs font-bold", isDark ? "text-emerald-400" : "text-emerald-600")}>
                    {remainingSlots} lease slot{remainingSlots === 1 ? '' : 's'} remaining
                  </span>
                )}
              </div>

              {/* Animated Capacity Progress Bar */}
              <div className={cn(
                "w-full h-3.5 rounded-full border p-0.5 overflow-hidden",
                isDark ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"
              )}>
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

              {/* Exceeded notice */}
              {usage.warningMessage && (
                <p className={cn("text-xs font-medium pt-1", isDark ? "text-amber-300" : "text-amber-700")}>
                  {usage.warningMessage}
                </p>
              )}
            </>
          )}
        </div>

        {/* Soft Non-blocking Retry Banner if error */}
        {errorMessage && (
          <div className={cn(
            "p-4 rounded-2xl border text-xs font-bold flex items-center justify-between",
            isDark ? "bg-amber-500/10 border-amber-500/25 text-amber-200" : "bg-amber-50 border-amber-200 text-amber-900"
          )}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => fetchSubscriptionData(true)}
              disabled={retrying}
              className={cn(
                "px-3 py-1 rounded-xl text-[11px] font-black uppercase flex items-center gap-1.5 cursor-pointer transition-all",
                isDark ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300" : "bg-amber-200 hover:bg-amber-300 text-amber-900"
              )}
            >
              {retrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* ── THREE LARGE PREMIUM PLAN CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const isPlanFree = plan.planId === 'free';
            const isPlanPlus = plan.planId === 'plus';
            const isPlanPro = plan.planId === 'pro';
            const isCurrent = isPlanFree ? (currentPlanId === 'free' || !currentPlanId) : (plan.planId === currentPlanId);
            const PlanIcon = planIcons[plan.planId] || Home;

            return (
              <motion.div
                key={plan.planId}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "relative rounded-[30px] border p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-2xl",
                  isDark
                    ? (isPlanPlus
                        ? "bg-gradient-to-b from-[#072421] via-[#041618] to-[#020A0D] border-emerald-400/60 shadow-[0_15px_40px_-10px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/40 md:-translate-y-2 text-white"
                        : isPlanPro
                        ? "bg-gradient-to-b from-[#08222C] via-[#04131C] to-[#02090F] border-cyan-500/40 hover:border-cyan-400/60 shadow-xl text-white"
                        : "bg-gradient-to-b from-[#0A161E] via-[#050E14] to-[#02060A] border-slate-800 hover:border-slate-700 shadow-lg text-white")
                    : (isPlanPlus
                        ? "bg-gradient-to-b from-emerald-50/90 via-white to-teal-50/40 border-emerald-400 shadow-[0_15px_35px_-10px_rgba(16,185,129,0.2)] ring-1 ring-emerald-400/50 md:-translate-y-2 text-slate-900"
                        : isPlanPro
                        ? "bg-gradient-to-b from-cyan-50/70 via-white to-emerald-50/30 border-cyan-300 shadow-lg text-slate-900"
                        : "bg-white border-slate-200 shadow-md text-slate-900")
                )}
              >
                {/* Plan Badge */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span
                    className={cn(
                      "px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg border",
                      isCurrent
                        ? (isDark ? "bg-emerald-950 text-emerald-300 border-emerald-500/40" : "bg-emerald-100 text-emerald-800 border-emerald-300")
                        : isPlanPlus
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-300 shadow-emerald-500/30"
                        : "bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-cyan-300 shadow-cyan-500/30"
                    )}
                  >
                    {isCurrent ? 'CURRENT PLAN' : (isPlanPlus ? 'MOST POPULAR' : 'BEST VALUE')}
                  </span>
                </div>

                <div className="space-y-6">
                  {/* Header: Icon + Title + Description */}
                  <div className="space-y-3">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner",
                        isDark
                          ? (isPlanPlus
                              ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                              : isPlanPro
                              ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300"
                              : "bg-slate-800/60 border-slate-700 text-slate-300")
                          : (isPlanPlus
                              ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                              : isPlanPro
                              ? "bg-cyan-100 border-cyan-300 text-cyan-700"
                              : "bg-slate-100 border-slate-200 text-slate-700")
                      )}
                    >
                      <PlanIcon className="w-6 h-6 stroke-[2.2]" />
                    </div>

                    <div>
                      <h3 className={cn(
                        "text-xl font-black tracking-tight uppercase",
                        isDark ? "text-white" : "text-slate-900"
                      )}>
                        {plan.planName}
                      </h3>
                      <p className={cn(
                        "text-xs font-medium mt-1",
                        isDark ? "text-slate-400" : "text-slate-500"
                      )}>
                        {plan.description || (isPlanPlus ? 'For residents managing multiple homes' : isPlanPro ? 'For comprehensive multi-property residents' : 'For individual renters & single residences')}
                      </p>
                    </div>
                  </div>

                  {/* Pricing Display */}
                  <div className="flex items-baseline gap-1.5 pb-2">
                    <span className={cn(
                      "text-4xl sm:text-5xl font-black tracking-tight",
                      isDark ? "text-white" : "text-slate-900"
                    )}>
                      ₹{plan.price}
                    </span>
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-wider",
                      isDark ? "text-slate-400" : "text-slate-500"
                    )}>
                      / month
                    </span>
                  </div>

                  {/* Lease Capacity Indicator Box */}
                  <div className={cn(
                    "p-4 rounded-2xl border space-y-2",
                    isDark ? "bg-slate-950/60 border-slate-800/90" : "bg-slate-50/80 border-slate-200"
                  )}>
                    <div className={cn(
                      "flex items-center justify-between text-[10px] font-black uppercase tracking-wider",
                      isDark ? "text-slate-400" : "text-slate-500"
                    )}>
                      <span>LEASE CAPACITY</span>
                      <span className={isPlanPlus ? (isDark ? 'text-emerald-400' : 'text-emerald-600 font-bold') : isPlanPro ? (isDark ? 'text-cyan-400' : 'text-cyan-600 font-bold') : (isDark ? 'text-slate-300' : 'text-slate-700')}>
                        {plan.maxLeases >= 999999 ? 'Unlimited (5+)' : `${plan.maxLeases} Leases`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className={cn(
                        "text-xs font-bold",
                        isDark ? "text-slate-200" : "text-slate-800"
                      )}>
                        {plan.maxLeases >= 999999 ? 'Unlimited active leases (5+)' : `Up to ${plan.maxLeases} active leases`}
                      </span>
                    </div>

                    <div className={cn(
                      "w-full h-1.5 rounded-full overflow-hidden",
                      isDark ? "bg-slate-900" : "bg-slate-200"
                    )}>
                      <div
                        className={cn(
                          "h-full rounded-full",
                          isPlanPro
                            ? "w-full bg-gradient-to-r from-cyan-400 to-teal-400"
                            : isPlanPlus
                            ? "w-3/4 bg-gradient-to-r from-emerald-400 to-teal-400"
                            : (isDark ? "w-2/5 bg-slate-600" : "w-2/5 bg-slate-400")
                        )}
                      />
                    </div>
                  </div>

                  {/* Feature List */}
                  <div className="space-y-3 pt-2">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-wider block",
                      isDark ? "text-slate-400" : "text-slate-500"
                    )}>
                      INCLUDED FEATURES
                    </span>

                    <div className="space-y-2.5">
                      {plan.features?.map((feat, idx) => (
                        <div key={idx} className={cn(
                          "flex items-start gap-2.5 text-xs",
                          isDark ? "text-slate-200" : "text-slate-700"
                        )}>
                          <div
                            className={cn(
                              "w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 border",
                              isDark
                                ? (isPlanPlus
                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                    : isPlanPro
                                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                                    : "bg-slate-800 border-slate-700 text-slate-400")
                                : (isPlanPlus
                                    ? "bg-emerald-100 border-emerald-300 text-emerald-600"
                                    : isPlanPro
                                    ? "bg-cyan-100 border-cyan-300 text-cyan-600"
                                    : "bg-slate-100 border-slate-300 text-slate-500")
                            )}
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span className={cn("font-medium leading-tight", isDark ? "text-slate-300" : "text-slate-700")}>{feat}</span>
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
                      className={cn(
                        "w-full py-4 rounded-2xl border font-black text-xs uppercase tracking-wider cursor-default flex items-center justify-center gap-2 shadow-inner",
                        isDark
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                          : "bg-emerald-50 border-emerald-200 text-emerald-800"
                      )}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Current Plan</span>
                    </button>
                  ) : isPlanFree ? (
                    <button
                      disabled
                      className={cn(
                        "w-full py-4 rounded-2xl border font-black text-xs uppercase tracking-wider cursor-default flex items-center justify-center gap-2",
                        isDark
                          ? "bg-slate-800/60 border-slate-700/60 text-slate-400"
                          : "bg-slate-100 border-slate-200 text-slate-500"
                      )}
                    >
                      <Check className="w-4 h-4 text-slate-400" />
                      <span>Included Base Tier</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={upgradingPlanId === plan.planId}
                      onClick={() => handleUpgrade(plan)}
                      className={cn(
                        "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
                        isPlanPlus
                          ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/30"
                          : "bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-600 hover:from-cyan-400 hover:to-teal-500 text-white shadow-cyan-500/30"
                      )}
                    >
                      {upgradingPlanId === plan.planId ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>Upgrade to {isPlanPlus ? 'Plus' : 'Pro'}</span>
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
        <div className={cn(
          "p-6 sm:p-8 rounded-[28px] border space-y-5 shadow-lg transition-all duration-300",
          isDark ? "bg-slate-950/80 border-slate-800" : "bg-white border-slate-200 shadow-slate-100"
        )}>
          <div>
            <h3 className={cn(
              "text-base font-black tracking-tight uppercase flex items-center gap-2",
              isDark ? "text-white" : "text-slate-900"
            )}>
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Why Upgrade?</span>
            </h3>
            <p className={cn("text-xs font-medium", isDark ? "text-slate-400" : "text-slate-500")}>
              Maximize your rental flexibility with enterprise-grade resident tools.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={cn(
              "p-4 rounded-2xl border space-y-1.5 transition-colors",
              isDark ? "bg-slate-900/70 border-slate-800/80" : "bg-slate-50/80 border-slate-200"
            )}>
              <div className="flex items-center gap-2 text-emerald-500">
                <Building2 className="w-4 h-4" />
                <span className={cn("text-xs font-black uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
                  Multiple Leases
                </span>
              </div>
              <p className={cn("text-[11px] font-medium leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
                Manage more rental properties simultaneously from one consolidated account.
              </p>
            </div>

            <div className={cn(
              "p-4 rounded-2xl border space-y-1.5 transition-colors",
              isDark ? "bg-slate-900/70 border-slate-800/80" : "bg-slate-50/80 border-slate-200"
            )}>
              <div className="flex items-center gap-2 text-teal-500">
                <ShieldCheck className="w-4 h-4" />
                <span className={cn("text-xs font-black uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
                  Priority Support
                </span>
              </div>
              <p className={cn("text-[11px] font-medium leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
                Get accelerated resolution and direct staff assistance when you need it.
              </p>
            </div>

            <div className={cn(
              "p-4 rounded-2xl border space-y-1.5 transition-colors",
              isDark ? "bg-slate-900/70 border-slate-800/80" : "bg-slate-50/80 border-slate-200"
            )}>
              <div className="flex items-center gap-2 text-cyan-500">
                <TrendingUp className="w-4 h-4" />
                <span className={cn("text-xs font-black uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
                  Advanced Insights
                </span>
              </div>
              <p className={cn("text-[11px] font-medium leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
                Access rich payment analytics, expense charts, and tax-ready PDF exports.
              </p>
            </div>

            <div className={cn(
              "p-4 rounded-2xl border space-y-1.5 transition-colors",
              isDark ? "bg-slate-900/70 border-slate-800/80" : "bg-slate-50/80 border-slate-200"
            )}>
              <div className="flex items-center gap-2 text-amber-500">
                <FolderLock className="w-4 h-4" />
                <span className={cn("text-xs font-black uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
                  Secure Documents
                </span>
              </div>
              <p className={cn("text-[11px] font-medium leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
                Permanent encrypted vault for all your lease agreements, bills, and receipts.
              </p>
            </div>
          </div>
        </div>

        {/* ── REDESIGNED HIGH-END SAAS COMPARE PLAN FEATURES SECTION ── */}
        <div className={cn(
          "relative rounded-[32px] border p-6 sm:p-10 overflow-hidden shadow-2xl transition-all duration-300",
          isDark
            ? "bg-gradient-to-b from-[#06141F] via-[#040D15] to-[#02070B] border-slate-800/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]"
            : "bg-gradient-to-b from-slate-50/95 via-white to-emerald-50/30 border-slate-200 shadow-xl"
        )}>
          {/* Subtle Ambient Background Radial Glows */}
          <div className={cn(
            "absolute -top-32 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none",
            isDark ? "bg-emerald-500/[0.04]" : "bg-emerald-400/[0.08]"
          )} />
          <div className={cn(
            "absolute -bottom-32 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none",
            isDark ? "bg-cyan-500/[0.04]" : "bg-cyan-400/[0.08]"
          )} />

          <div className="relative z-10 space-y-8">
            {/* Header Area */}
            <div className="space-y-2">
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black tracking-widest uppercase shadow-sm",
                isDark ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-800"
              )}>
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                <span>✦ PLAN COMPARISON</span>
              </div>
              <h2 className={cn(
                "text-2xl sm:text-3xl font-black tracking-tight",
                isDark ? "text-white" : "text-slate-900"
              )}>
                Compare Plan Features
              </h2>
              <p className={cn(
                "text-xs sm:text-sm font-medium",
                isDark ? "text-slate-400" : "text-slate-500"
              )}>
                Detailed breakdown of capacity and features across all Resident tiers.
              </p>
            </div>

            {/* Premium Table Container */}
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="min-w-[620px] pb-2">
                {/* Column Headers Grid */}
                <div className={cn(
                  "grid grid-cols-12 gap-3 sm:gap-4 pb-4 items-end border-b",
                  isDark ? "border-slate-800/80" : "border-slate-200"
                )}>
                  <div className={cn(
                    "col-span-5 px-3 py-2 text-[10px] font-black uppercase tracking-widest",
                    isDark ? "text-slate-400" : "text-slate-500"
                  )}>
                    FEATURE BREAKDOWN
                  </div>

                  {/* FREE Header Cell */}
                  <div className="col-span-2 text-center">
                    <div className={cn(
                      "p-3 sm:p-4 rounded-2xl border space-y-1 shadow-sm",
                      isDark ? "bg-slate-900/60 border-slate-800/80" : "bg-slate-100 border-slate-200"
                    )}>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider block",
                        isDark ? "text-slate-400" : "text-slate-500"
                      )}>
                        FREE
                      </span>
                      <span className={cn(
                        "text-base sm:text-lg font-black block tracking-tight",
                        isDark ? "text-white" : "text-slate-900"
                      )}>
                        ₹0 <span className={cn("text-[10px] font-bold font-normal", isDark ? "text-slate-500" : "text-slate-400")}>/mo</span>
                      </span>
                      <span className={cn("text-[10px] font-bold block", isDark ? "text-slate-400" : "text-slate-600")}>
                        2 leases
                      </span>
                    </div>
                  </div>

                  {/* PLUS Header Cell (Emphasized) */}
                  <div className="col-span-2 text-center relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[8px] font-black tracking-widest uppercase shadow-md whitespace-nowrap border border-emerald-300/40">
                        MOST POPULAR
                      </span>
                    </div>
                    <div className={cn(
                      "p-3 sm:p-4 rounded-2xl border space-y-1 ring-1",
                      isDark
                        ? "bg-gradient-to-b from-emerald-950/50 to-emerald-950/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-emerald-500/20"
                        : "bg-gradient-to-b from-emerald-100/70 to-emerald-50/40 border-emerald-300 shadow-md ring-emerald-400/20"
                    )}>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider block",
                        isDark ? "text-emerald-400" : "text-emerald-700"
                      )}>
                        ✦ PLUS
                      </span>
                      <span className={cn(
                        "text-base sm:text-lg font-black block tracking-tight",
                        isDark ? "text-white" : "text-slate-900"
                      )}>
                        ₹499 <span className={cn("text-[10px] font-bold font-normal", isDark ? "text-emerald-400/70" : "text-emerald-600")}>/mo</span>
                      </span>
                      <span className={cn("text-[10px] font-bold block", isDark ? "text-emerald-300" : "text-emerald-800")}>
                        4 leases
                      </span>
                    </div>
                  </div>

                  {/* PRO Header Cell */}
                  <div className="col-span-3 text-center relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-[8px] font-black tracking-widest uppercase shadow-md whitespace-nowrap border border-cyan-300/40">
                        BEST VALUE
                      </span>
                    </div>
                    <div className={cn(
                      "p-3 sm:p-4 rounded-2xl border space-y-1",
                      isDark
                        ? "bg-gradient-to-b from-cyan-950/50 to-cyan-950/20 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                        : "bg-gradient-to-b from-cyan-100/70 to-cyan-50/40 border-cyan-300 shadow-md"
                    )}>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider block",
                        isDark ? "text-cyan-400" : "text-cyan-700"
                      )}>
                        ♛ PRO
                      </span>
                      <span className={cn(
                        "text-base sm:text-lg font-black block tracking-tight",
                        isDark ? "text-white" : "text-slate-900"
                      )}>
                        ₹999 <span className={cn("text-[10px] font-bold font-normal", isDark ? "text-cyan-400/70" : "text-cyan-600")}>/mo</span>
                      </span>
                      <span className={cn("text-[10px] font-bold block", isDark ? "text-cyan-300" : "text-cyan-800")}>
                        Unlimited (5+)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Feature Rows */}
                <div className={cn(
                  "divide-y",
                  isDark ? "divide-slate-800/40" : "divide-slate-200/80"
                )}>
                  {/* Row 1: Active Leases */}
                  <div className={cn(
                    "grid grid-cols-12 gap-3 sm:gap-4 py-4 px-3 items-center rounded-xl transition-colors duration-200",
                    isDark ? "hover:bg-slate-800/30" : "hover:bg-emerald-50/50"
                  )}>
                    <div className="col-span-5 flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm",
                        isDark ? "bg-slate-800/80 border-slate-700/70 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                      )}>
                        <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <span className={cn("text-xs font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                        Active Leases
                      </span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full border font-mono font-bold text-xs shadow-inner",
                        isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                      )}>
                        2
                      </span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full border font-mono font-bold text-xs shadow-sm",
                        isDark ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-300" : "bg-emerald-100 border-emerald-300 text-emerald-800"
                      )}>
                        4
                      </span>
                    </div>

                    <div className="col-span-3 text-center flex justify-center">
                      <span className={cn(
                        "px-3.5 py-1 rounded-full border font-mono font-bold text-xs shadow-sm",
                        isDark ? "bg-cyan-500/15 border-cyan-500/35 text-cyan-300" : "bg-cyan-100 border-cyan-300 text-cyan-800"
                      )}>
                        Unlimited (5+)
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Rent Payments & Receipts */}
                  <div className={cn(
                    "grid grid-cols-12 gap-3 sm:gap-4 py-3.5 px-3 items-center rounded-xl transition-colors duration-200",
                    isDark ? "hover:bg-slate-800/30" : "hover:bg-emerald-50/50"
                  )}>
                    <div className="col-span-5 flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm",
                        isDark ? "bg-slate-800/80 border-slate-700/70 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                      )}>
                        <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <span className={cn("text-xs font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
                        Rent Payments &amp; Receipts
                      </span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <div className="col-span-3 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Utility Invoices & Bills */}
                  <div className={cn(
                    "grid grid-cols-12 gap-3 sm:gap-4 py-3.5 px-3 items-center rounded-xl transition-colors duration-200",
                    isDark ? "hover:bg-slate-800/30" : "hover:bg-emerald-50/50"
                  )}>
                    <div className="col-span-5 flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm",
                        isDark ? "bg-slate-800/80 border-slate-700/70 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                      )}>
                        <FileText className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <span className={cn("text-xs font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
                        Utility Invoices &amp; Bills
                      </span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <div className="col-span-3 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Direct Landlord Messaging */}
                  <div className={cn(
                    "grid grid-cols-12 gap-3 sm:gap-4 py-3.5 px-3 items-center rounded-xl transition-colors duration-200",
                    isDark ? "hover:bg-slate-800/30" : "hover:bg-emerald-50/50"
                  )}>
                    <div className="col-span-5 flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm",
                        isDark ? "bg-slate-800/80 border-slate-700/70 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                      )}>
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <span className={cn("text-xs font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
                        Direct Landlord Messaging
                      </span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <div className="col-span-3 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>

                  {/* Row 5: Advanced Tax & Expense Reports */}
                  <div className={cn(
                    "grid grid-cols-12 gap-3 sm:gap-4 py-3.5 px-3 items-center rounded-xl transition-colors duration-200",
                    isDark ? "hover:bg-slate-800/30" : "hover:bg-emerald-50/50"
                  )}>
                    <div className="col-span-5 flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm",
                        isDark ? "bg-slate-800/80 border-slate-700/70 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                      )}>
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <span className={cn("text-xs font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
                        Advanced Tax &amp; Expense Reports
                      </span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <span className={cn("font-mono text-base select-none", isDark ? "text-slate-600" : "text-slate-400")}>—</span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <div className="col-span-3 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>

                  {/* Row 6: Priority Resident Support */}
                  <div className={cn(
                    "grid grid-cols-12 gap-3 sm:gap-4 py-3.5 px-3 items-center rounded-xl transition-colors duration-200",
                    isDark ? "hover:bg-slate-800/30" : "hover:bg-emerald-50/50"
                  )}>
                    <div className="col-span-5 flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm",
                        isDark ? "bg-slate-800/80 border-slate-700/70 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                      )}>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <span className={cn("text-xs font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
                        Priority Resident Support
                      </span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <span className={cn("font-mono text-base select-none", isDark ? "text-slate-600" : "text-slate-400")}>—</span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <div className="col-span-3 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>

                  {/* Row 7: Lifetime Document Vault & Early Access */}
                  <div className={cn(
                    "grid grid-cols-12 gap-3 sm:gap-4 py-3.5 px-3 items-center rounded-xl transition-colors duration-200",
                    isDark ? "hover:bg-slate-800/30" : "hover:bg-emerald-50/50"
                  )}>
                    <div className="col-span-5 flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm",
                        isDark ? "bg-slate-800/80 border-slate-700/70 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                      )}>
                        <FolderLock className="w-3.5 h-3.5 text-cyan-500" />
                      </div>
                      <span className={cn("text-xs font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
                        Lifetime Document Vault &amp; Early Access
                      </span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <span className={cn("font-mono text-base select-none", isDark ? "text-slate-600" : "text-slate-400")}>—</span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <span className={cn("font-mono text-base select-none", isDark ? "text-slate-600" : "text-slate-400")}>—</span>
                    </div>

                    <div className="col-span-3 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border shadow-sm",
                        isDark ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]" : "bg-cyan-100 border-cyan-300 text-cyan-800"
                      )}>
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span className="text-[10px] font-black tracking-wider uppercase">VIP</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Subtitle */}
                <div className={cn(
                  "pt-6 mt-4 border-t flex flex-col sm:flex-row items-center justify-between text-xs gap-2",
                  isDark ? "border-slate-800/60 text-slate-400" : "border-slate-200 text-slate-600"
                )}>
                  <span className="font-medium">Choose the plan that fits your rental portfolio.</span>
                  <span className={cn("text-[11px]", isDark ? "text-slate-500" : "text-slate-400")}>Plans can be upgraded as your leasing needs grow.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
