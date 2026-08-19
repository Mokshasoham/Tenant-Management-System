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
  ArrowLeft,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
  Lock,
  Briefcase,
  Crown,
  Layers,
  Users,
  BarChart3,
  FileText,
  RefreshCw,
  Cpu,
  FolderLock
} from 'lucide-react';
import { subscriptionService } from '../../../services/api';
import { useTheme } from '../../../context/ThemeContext';
import { cn } from '../../../utils/cn';

// Authoritative fallback plans for Manager Portal
const FALLBACK_MANAGER_PLANS = [
  {
    planId: 'starter',
    planName: 'Manager Starter',
    description: 'For independent landlords & single property complexes',
    price: 0,
    maxProperties: 3,
    badge: 'CURRENT PLAN',
    features: [
      'Manage up to 3 properties',
      'Full tenant management directory',
      'Digital lease agreement workflows',
      'Maintenance dispatch & ticket tracking',
      'Automated rent collection & invoices',
      'Standard operational reports',
    ],
  },
  {
    planId: 'plus',
    planName: 'Manager Plus',
    description: 'For growing property managers & mid-scale portfolios',
    price: 1499,
    maxProperties: 5,
    badge: 'MOST POPULAR',
    features: [
      'Everything in Manager Starter',
      'Manage up to 5 properties',
      'Advanced financial & occupancy analytics',
      'Enhanced tenant verification tools',
      'Priority technician dispatch coordination',
      'Detailed PDF & CSV audit exports',
    ],
  },
  {
    planId: 'pro',
    planName: 'Manager Pro',
    description: 'For enterprise real estate & multi-property firms',
    price: 2999,
    maxProperties: 999999,
    badge: 'FOR GROWING PORTFOLIOS',
    features: [
      'Everything in Manager Plus',
      'Unlimited property portfolio (6+)',
      'Enterprise analytics & revenue forecasting',
      'Multi-manager & staff delegation tools',
      'Dedicated account management',
      'Custom workflow automations & API access',
    ],
  },
];

export default function ManagerSubscriptionPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [subData, setSubData] = useState(null);
  const [plans, setPlans] = useState(FALLBACK_MANAGER_PLANS);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [upgradingPlanId, setUpgradingPlanId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  const fetchSubscriptionData = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    else setLoading(true);
    setErrorMessage(null);

    try {
      const res = await subscriptionService.getMySubscription();
      const payload = res?.data?.data || res?.data || res;
      if (payload) {
        setSubData(payload);
        if (payload.availablePlans && Array.isArray(payload.availablePlans) && payload.availablePlans.length > 0) {
          const sanitizedPlans = payload.availablePlans.map((p) => {
            const pId = (p.planId || '').toLowerCase();
            return {
              ...p,
              planId: pId,
              planName: pId === 'plus' ? 'Manager Plus' : (pId === 'pro' ? 'Manager Pro' : 'Manager Starter'),
              maxProperties: pId === 'plus' ? 5 : (pId === 'pro' ? 999999 : 3),
              price: pId === 'starter' ? 0 : (p.price || (pId === 'plus' ? 1499 : 2999)),
              badge: pId === 'plus' ? 'MOST POPULAR' : (pId === 'pro' ? 'FOR GROWING PORTFOLIOS' : 'CURRENT PLAN'),
            };
          });
          setPlans(sanitizedPlans);
        } else {
          setPlans(FALLBACK_MANAGER_PLANS);
        }
      }
    } catch (err) {
      console.warn('[ManagerSubscription] Error loading manager subscription:', err);
      setSubData((prev) => prev || {
        subscription: {
          planId: 'starter',
          planName: 'Manager Starter',
          status: 'active',
          price: 0,
          billingCycle: 'monthly',
          maxProperties: 3,
        },
        usage: {
          currentCount: 0,
          maxLimit: 3,
          isUnlimited: false,
          remainingSlots: 3,
          percentage: 0,
          isAtLimit: false,
          isExceeded: false,
        },
        availablePlans: FALLBACK_MANAGER_PLANS,
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

  // Razorpay Checkout Handler for Manager Upgrades
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
          name: 'Property Operations Manager',
        },
        theme: {
          color: '#4f46e5',
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

  const currentPlanId = (subData?.subscription?.planId || 'starter').toLowerCase();
  const currentPlanName = subData?.subscription?.planName || 'Manager Starter';
  const usage = subData?.usage || { currentCount: 0, maxLimit: 3, isUnlimited: false, remainingSlots: 3 };

  const currentCount = usage.currentCount ?? 0;
  const maxLimit = usage.isUnlimited ? 999999 : (usage.maxLimit || 3);
  const isExceeded = !usage.isUnlimited && currentCount > maxLimit;
  const isAtLimit = !usage.isUnlimited && currentCount === maxLimit;
  const remainingSlots = usage.isUnlimited ? 999999 : Math.max(0, maxLimit - currentCount);

  const allowedBarPercent = usage.isUnlimited
    ? 100
    : Math.min(100, Math.round((Math.min(currentCount, maxLimit) / maxLimit) * 100));
  
  const overflowCount = isExceeded ? currentCount - maxLimit : 0;

  const planIcons = {
    starter: Building2,
    plus: Sparkles,
    pro: Crown,
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300 p-4 sm:p-6 lg:p-8 font-sans",
      isDark ? "bg-[#020612] text-slate-100 selection:bg-indigo-500/30" : "bg-transparent text-slate-900 selection:bg-indigo-500/20"
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
              isDark ? "bg-indigo-950 border-indigo-500/40 text-indigo-200" : "bg-white border-indigo-300 text-indigo-900 shadow-indigo-500/10"
            )}
          >
            <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
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

        {/* ── 1. PREMIUM HERO SECTION (Operations Glassmorphism) ── */}
        <div className={cn(
          "relative rounded-[32px] border p-6 sm:p-10 overflow-hidden transition-all duration-300",
          isDark
            ? "bg-gradient-to-r from-[#0C1533] via-[#080E24] to-[#040714] border-indigo-500/30 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85)]"
            : "bg-gradient-to-r from-indigo-50/95 via-blue-50/90 to-white border-indigo-200 shadow-[0_15px_35px_-10px_rgba(99,102,241,0.12)]"
        )}>
          <div className={cn(
            "absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none",
            isDark ? "bg-indigo-500/10" : "bg-indigo-400/15"
          )} />
          <div className={cn(
            "absolute bottom-0 left-1/3 w-80 h-80 rounded-full blur-3xl pointer-events-none",
            isDark ? "bg-blue-600/[0.07]" : "bg-blue-400/10"
          )} />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black tracking-widest uppercase shadow-sm",
                isDark ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400" : "bg-indigo-100 border-indigo-300 text-indigo-800"
              )}>
                <Briefcase className="w-3 h-3 text-indigo-500" />
                <span>✦ PROPERTY OPERATIONS</span>
              </div>
              <h1 className={cn(
                "text-2xl sm:text-4xl font-black tracking-tight",
                isDark ? "text-white" : "text-slate-900"
              )}>
                Scale Your Property Operations
              </h1>
              <p className={cn(
                "text-xs sm:text-sm max-w-xl font-medium leading-relaxed",
                isDark ? "text-slate-300" : "text-slate-600"
              )}>
                Expand your property portfolio capacity, unlock enterprise revenue analytics, and coordinate multi-tenant maintenance at scale.
              </p>
            </div>

            {/* Current Status Card on Right */}
            <div className={cn(
              "p-4 sm:p-5 rounded-2xl border flex items-center gap-4 shrink-0 shadow-lg",
              isDark ? "bg-[#070E25]/90 border-indigo-500/35 ring-1 ring-indigo-500/20" : "bg-white/95 border-indigo-200 shadow-indigo-500/5"
            )}>
              <div className={cn(
                "w-12 h-12 rounded-2xl border flex items-center justify-center shadow-inner",
                isDark ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400" : "bg-indigo-100 border-indigo-300 text-indigo-700"
              )}>
                <Building2 className="w-6 h-6 stroke-[2.2]" />
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
                    {usage.isUnlimited ? 'Unlimited properties' : `${maxLimit} property capacity`}
                  </span>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.2 rounded-full text-[9px] font-black tracking-wide border",
                    isDark ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" : "bg-indigo-100 text-indigo-800 border-indigo-300"
                  )}>
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. PROPERTY PORTFOLIO CAPACITY CARD ── */}
        <div className={cn(
          "p-6 rounded-[24px] border space-y-4 shadow-lg relative overflow-hidden transition-all duration-300",
          isDark ? "bg-[#050C1F]/90 border-slate-800/90" : "bg-white border-slate-200 shadow-slate-100"
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
                  <Building2 className="w-4 h-4 text-indigo-500" />
                  <span className={cn(
                    "text-xs font-black uppercase tracking-wider",
                    isDark ? "text-slate-200" : "text-slate-800"
                  )}>
                    PROPERTY PORTFOLIO CAPACITY
                  </span>
                  <span className={cn(
                    "text-xs font-mono font-bold",
                    isDark ? "text-slate-400" : "text-slate-500"
                  )}>
                    ({currentCount} / {usage.isUnlimited ? '∞ Unlimited' : `${maxLimit} properties used`})
                  </span>
                </div>

                {isExceeded ? (
                  <span className={cn(
                    "text-xs font-bold flex items-center gap-1.5 px-3 py-1 rounded-full border",
                    isDark ? "text-amber-400 bg-amber-500/10 border-amber-500/30" : "text-amber-800 bg-amber-100 border-amber-300"
                  )}>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>PLAN LIMIT EXCEEDED (Downgrade safety active)</span>
                  </span>
                ) : isAtLimit ? (
                  <span className={cn(
                    "text-xs font-bold flex items-center gap-1.5 px-3 py-1 rounded-full border",
                    isDark ? "text-amber-400 bg-amber-500/10 border-amber-500/30" : "text-amber-800 bg-amber-100 border-amber-300"
                  )}>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>0 property slots remaining (Limit reached)</span>
                  </span>
                ) : (
                  <span className={cn("text-xs font-bold", isDark ? "text-indigo-400" : "text-indigo-600")}>
                    {remainingSlots} property slot{remainingSlots === 1 ? '' : 's'} remaining
                  </span>
                )}
              </div>

              {/* Enhanced Visual Capacity Bar (Allowed Base + Overflow Component) */}
              <div className="space-y-1.5">
                <div className={cn(
                  "w-full h-4 rounded-full border p-0.5 overflow-hidden flex gap-1",
                  isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"
                )}>
                  {/* Allowed Capacity Segment */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: isExceeded ? '60%' : `${allowedBarPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isExceeded
                        ? "bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-500"
                        : isAtLimit
                        ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-500"
                        : "bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                    )}
                  />

                  {/* Overflow Exceeded Segment */}
                  {isExceeded && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '40%' }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                    />
                  )}
                </div>

                {isExceeded && (
                  <div className={cn(
                    "flex items-center justify-between text-[10px] font-mono font-bold px-1",
                    isDark ? "text-slate-400" : "text-slate-500"
                  )}>
                    <span className={isDark ? "text-indigo-400" : "text-indigo-600"}>Allowed on Starter: {maxLimit}</span>
                    <span className="text-rose-500">Overflow: +{overflowCount} properties</span>
                  </div>
                )}
              </div>

              {/* Warning/Safety Notice underneath */}
              {isExceeded && (
                <div className={cn(
                  "p-3.5 rounded-xl border text-xs font-medium space-y-1",
                  isDark ? "bg-amber-500/10 border-amber-500/25 text-amber-200" : "bg-amber-50 border-amber-200 text-amber-900"
                )}>
                  <p>
                    You currently have <strong className={isDark ? "text-white font-bold" : "text-slate-900 font-bold"}>{currentCount} properties</strong>. Your current plan allows <strong className={isDark ? "text-white font-bold" : "text-slate-900 font-bold"}>{maxLimit}</strong>. Existing records remain safe, but adding new ones is restricted.
                  </p>
                </div>
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

        {/* ── 3. THREE LARGE PREMIUM PLAN CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const isStarter = plan.planId === 'starter';
            const isPlus = plan.planId === 'plus';
            const isPro = plan.planId === 'pro';
            const isCurrent = isStarter ? (currentPlanId === 'starter' || !currentPlanId) : (plan.planId === currentPlanId);
            const PlanIcon = planIcons[plan.planId] || Building2;

            return (
              <motion.div
                key={plan.planId}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "relative rounded-[30px] border p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-2xl",
                  isDark
                    ? (isPlus
                        ? "bg-gradient-to-b from-[#0F1B3E] via-[#091028] to-[#040816] border-indigo-400/60 shadow-[0_15px_40px_-10px_rgba(99,102,241,0.3)] ring-1 ring-indigo-400/40 md:-translate-y-2 text-white"
                        : isPro
                        ? "bg-gradient-to-b from-[#131131] via-[#0B0920] to-[#04030E] border-violet-500/40 hover:border-violet-400/60 shadow-xl text-white"
                        : "bg-gradient-to-b from-[#0B132B] via-[#060B1A] to-[#02050E] border-slate-800 hover:border-slate-700 shadow-lg text-white")
                    : (isPlus
                        ? "bg-gradient-to-b from-indigo-50/95 via-white to-blue-50/40 border-indigo-400 shadow-[0_15px_35px_-10px_rgba(99,102,241,0.2)] ring-1 ring-indigo-400/50 md:-translate-y-2 text-slate-900"
                        : isPro
                        ? "bg-gradient-to-b from-violet-50/70 via-white to-indigo-50/30 border-violet-300 shadow-lg text-slate-900"
                        : "bg-white border-slate-200 shadow-md text-slate-900")
                )}
              >
                {/* Plan Badge */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span
                    className={cn(
                      "px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg border",
                      isCurrent
                        ? (isDark ? "bg-indigo-950 text-indigo-300 border-indigo-500/40" : "bg-indigo-100 text-indigo-800 border-indigo-300")
                        : isPlus
                        ? "bg-gradient-to-r from-indigo-500 to-blue-500 text-white border-indigo-300 shadow-indigo-500/30"
                        : "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white border-violet-300 shadow-violet-500/30"
                    )}
                  >
                    {isCurrent ? 'CURRENT PLAN' : (isPlus ? 'MOST POPULAR' : 'FOR GROWING PORTFOLIOS')}
                  </span>
                </div>

                <div className="space-y-6">
                  {/* Header: Icon + Title + Description */}
                  <div className="space-y-3">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner",
                        isDark
                          ? (isPlus
                              ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-300"
                              : isPro
                              ? "bg-violet-500/20 border-violet-400/40 text-violet-300"
                              : "bg-slate-800/60 border-slate-700 text-slate-300")
                          : (isPlus
                              ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                              : isPro
                              ? "bg-violet-100 border-violet-300 text-violet-700"
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
                        {plan.description || (isPlus ? 'For growing property managers & mid-scale portfolios' : isPro ? 'For enterprise real estate & multi-property firms' : 'For independent landlords & single property complexes')}
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

                  {/* Property Capacity Indicator Box */}
                  <div className={cn(
                    "p-4 rounded-2xl border space-y-2",
                    isDark ? "bg-slate-950/60 border-slate-800/90" : "bg-slate-50/80 border-slate-200"
                  )}>
                    <div className={cn(
                      "flex items-center justify-between text-[10px] font-black uppercase tracking-wider",
                      isDark ? "text-slate-400" : "text-slate-500"
                    )}>
                      <span>PROPERTY CAPACITY</span>
                      <span className={isPlus ? (isDark ? 'text-indigo-400' : 'text-indigo-600 font-bold') : isPro ? (isDark ? 'text-violet-400' : 'text-violet-600 font-bold') : (isDark ? 'text-slate-300' : 'text-slate-700')}>
                        {plan.maxProperties >= 999999 ? 'Unlimited (6+)' : `${plan.maxProperties} Properties`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full animate-pulse shrink-0", isPlus ? "bg-indigo-500" : isPro ? "bg-violet-500" : "bg-blue-500")} />
                      <span className={cn(
                        "text-xs font-bold",
                        isDark ? "text-slate-200" : "text-slate-800"
                      )}>
                        {plan.maxProperties >= 999999 ? 'Unlimited property portfolio (6+)' : `Up to ${plan.maxProperties} properties`}
                      </span>
                    </div>

                    <div className={cn(
                      "w-full h-1.5 rounded-full overflow-hidden",
                      isDark ? "bg-slate-900" : "bg-slate-200"
                    )}>
                      <div
                        className={cn(
                          "h-full rounded-full",
                          isPro
                            ? "w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"
                            : isPlus
                            ? "w-3/4 bg-gradient-to-r from-blue-500 to-indigo-500"
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
                                ? (isPlus
                                    ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400"
                                    : isPro
                                    ? "bg-violet-500/20 border-violet-500/40 text-violet-400"
                                    : "bg-slate-800 border-slate-700 text-slate-400")
                                : (isPlus
                                    ? "bg-indigo-100 border-indigo-300 text-indigo-600"
                                    : isPro
                                    ? "bg-violet-100 border-violet-300 text-violet-600"
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
                          ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                          : "bg-indigo-50 border-indigo-200 text-indigo-800"
                      )}
                    >
                      <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                      <span>Current Plan</span>
                    </button>
                  ) : isStarter ? (
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
                        isPlus
                          ? "bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600 hover:from-indigo-400 hover:to-blue-500 text-white shadow-indigo-500/30"
                          : "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-violet-500/30"
                      )}
                    >
                      {upgradingPlanId === plan.planId ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>Upgrade to {isPlus ? 'Plus' : 'Pro'}</span>
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

        {/* ── 4. WHY UPGRADE? BENEFITS STRIP (Operations Focus) ── */}
        <div className={cn(
          "p-6 sm:p-8 rounded-[28px] border space-y-5 shadow-lg transition-all duration-300",
          isDark ? "bg-slate-950/80 border-slate-800" : "bg-white border-slate-200 shadow-slate-100"
        )}>
          <div>
            <h3 className={cn(
              "text-base font-black tracking-tight uppercase flex items-center gap-2",
              isDark ? "text-white" : "text-slate-900"
            )}>
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Why Upgrade?</span>
            </h3>
            <p className={cn("text-xs font-medium", isDark ? "text-slate-400" : "text-slate-500")}>
              Enterprise property tools built to scale operations and revenue.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={cn(
              "p-4 rounded-2xl border space-y-1.5 transition-colors",
              isDark ? "bg-slate-900/70 border-slate-800/80" : "bg-slate-50/80 border-slate-200"
            )}>
              <div className="flex items-center gap-2 text-blue-500">
                <Building2 className="w-4 h-4" />
                <span className={cn("text-xs font-black uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
                  Portfolio Scaling
                </span>
              </div>
              <p className={cn("text-[11px] font-medium leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
                Manage more properties and units simultaneously from one unified operations control center.
              </p>
            </div>

            <div className={cn(
              "p-4 rounded-2xl border space-y-1.5 transition-colors",
              isDark ? "bg-slate-900/70 border-slate-800/80" : "bg-slate-50/80 border-slate-200"
            )}>
              <div className="flex items-center gap-2 text-indigo-500">
                <TrendingUp className="w-4 h-4" />
                <span className={cn("text-xs font-black uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
                  Advanced Analytics
                </span>
              </div>
              <p className={cn("text-[11px] font-medium leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
                Financial, occupancy and revenue insights with tax-ready CSV and PDF audit exports.
              </p>
            </div>

            <div className={cn(
              "p-4 rounded-2xl border space-y-1.5 transition-colors",
              isDark ? "bg-slate-900/70 border-slate-800/80" : "bg-slate-50/80 border-slate-200"
            )}>
              <div className="flex items-center gap-2 text-violet-500">
                <Users className="w-4 h-4" />
                <span className={cn("text-xs font-black uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
                  Team Management
                </span>
              </div>
              <p className={cn("text-[11px] font-medium leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
                Coordinate managers, technicians and staff with role delegation and workflow logs.
              </p>
            </div>

            <div className={cn(
              "p-4 rounded-2xl border space-y-1.5 transition-colors",
              isDark ? "bg-slate-900/70 border-slate-800/80" : "bg-slate-50/80 border-slate-200"
            )}>
              <div className="flex items-center gap-2 text-cyan-500">
                <Zap className="w-4 h-4" />
                <span className={cn("text-xs font-black uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
                  Automation &amp; API
                </span>
              </div>
              <p className={cn("text-[11px] font-medium leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
                Automate operational workflows, lease renewal cycles, and custom webhook integrations.
              </p>
            </div>
          </div>
        </div>

        {/* ── 5. COMPARE MANAGER PLAN FEATURES (High-End SaaS Comparison) ── */}
        <div className={cn(
          "relative rounded-[32px] border p-6 sm:p-10 overflow-hidden shadow-2xl transition-all duration-300",
          isDark
            ? "bg-gradient-to-b from-[#0C1533] via-[#070D22] to-[#030612] border-indigo-500/25 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]"
            : "bg-gradient-to-b from-slate-50/95 via-white to-indigo-50/30 border-slate-200 shadow-xl"
        )}>
          {/* Subtle Ambient Background Radial Glows */}
          <div className={cn(
            "absolute -top-32 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none",
            isDark ? "bg-indigo-500/[0.05]" : "bg-indigo-400/[0.08]"
          )} />
          <div className={cn(
            "absolute -bottom-32 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none",
            isDark ? "bg-violet-500/[0.05]" : "bg-violet-400/[0.08]"
          )} />

          <div className="relative z-10 space-y-8">
            {/* Header Area */}
            <div className="space-y-2">
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black tracking-widest uppercase shadow-sm",
                isDark ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-400" : "bg-indigo-100 border-indigo-300 text-indigo-800"
              )}>
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>✦ PLAN COMPARISON</span>
              </div>
              <h2 className={cn(
                "text-2xl sm:text-3xl font-black tracking-tight",
                isDark ? "text-white" : "text-slate-900"
              )}>
                Compare Manager Plan Features
              </h2>
              <p className={cn(
                "text-xs sm:text-sm font-medium",
                isDark ? "text-slate-400" : "text-slate-500"
              )}>
                Detailed breakdown of portfolio capacity and operations across all Manager tiers.
              </p>
            </div>

            {/* Premium Table Container */}
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="min-w-[640px] pb-2">
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

                  {/* STARTER Header Cell */}
                  <div className="col-span-2 text-center">
                    <div className={cn(
                      "p-3 sm:p-4 rounded-2xl border space-y-1 shadow-sm",
                      isDark ? "bg-slate-900/60 border-slate-800/80" : "bg-slate-100 border-slate-200"
                    )}>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider block",
                        isDark ? "text-slate-400" : "text-slate-500"
                      )}>
                        STARTER
                      </span>
                      <span className={cn(
                        "text-base sm:text-lg font-black block tracking-tight",
                        isDark ? "text-white" : "text-slate-900"
                      )}>
                        ₹0 <span className={cn("text-[10px] font-bold font-normal", isDark ? "text-slate-500" : "text-slate-400")}>/mo</span>
                      </span>
                      <span className={cn("text-[10px] font-bold block", isDark ? "text-slate-400" : "text-slate-600")}>
                        3 properties
                      </span>
                    </div>
                  </div>

                  {/* PLUS Header Cell (Emphasized) */}
                  <div className="col-span-2 text-center relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-[8px] font-black tracking-widest uppercase shadow-md whitespace-nowrap border border-indigo-300/40">
                        MOST POPULAR
                      </span>
                    </div>
                    <div className={cn(
                      "p-3 sm:p-4 rounded-2xl border space-y-1 ring-1",
                      isDark
                        ? "bg-gradient-to-b from-indigo-950/60 to-indigo-950/20 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)] ring-indigo-500/30"
                        : "bg-gradient-to-b from-indigo-100/70 to-indigo-50/40 border-indigo-300 shadow-md ring-indigo-400/20"
                    )}>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider block",
                        isDark ? "text-indigo-400" : "text-indigo-700"
                      )}>
                        ✦ PLUS
                      </span>
                      <span className={cn(
                        "text-base sm:text-lg font-black block tracking-tight",
                        isDark ? "text-white" : "text-slate-900"
                      )}>
                        ₹1,499 <span className={cn("text-[10px] font-bold font-normal", isDark ? "text-indigo-400/70" : "text-indigo-600")}>/mo</span>
                      </span>
                      <span className={cn("text-[10px] font-bold block", isDark ? "text-indigo-300" : "text-indigo-800")}>
                        5 properties
                      </span>
                    </div>
                  </div>

                  {/* PRO Header Cell */}
                  <div className="col-span-3 text-center relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white text-[8px] font-black tracking-widest uppercase shadow-md whitespace-nowrap border border-violet-300/40">
                        GROWING PORTFOLIOS
                      </span>
                    </div>
                    <div className={cn(
                      "p-3 sm:p-4 rounded-2xl border space-y-1",
                      isDark
                        ? "bg-gradient-to-b from-violet-950/50 to-violet-950/20 border-violet-500/40 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                        : "bg-gradient-to-b from-violet-100/70 to-violet-50/40 border-violet-300 shadow-md"
                    )}>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider block",
                        isDark ? "text-violet-400" : "text-violet-700"
                      )}>
                        ♛ PRO
                      </span>
                      <span className={cn(
                        "text-base sm:text-lg font-black block tracking-tight",
                        isDark ? "text-white" : "text-slate-900"
                      )}>
                        ₹2,999 <span className={cn("text-[10px] font-bold font-normal", isDark ? "text-violet-400/70" : "text-violet-600")}>/mo</span>
                      </span>
                      <span className={cn("text-[10px] font-bold block", isDark ? "text-violet-300" : "text-violet-800")}>
                        Unlimited (6+)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Feature Rows */}
                <div className={cn(
                  "divide-y",
                  isDark ? "divide-slate-800/40" : "divide-slate-200/80"
                )}>
                  {/* Row 1: Properties Managed */}
                  <div className={cn(
                    "grid grid-cols-12 gap-3 sm:gap-4 py-4 px-3 items-center rounded-xl transition-colors duration-200",
                    isDark ? "hover:bg-slate-800/30" : "hover:bg-indigo-50/50"
                  )}>
                    <div className="col-span-5 flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm",
                        isDark ? "bg-slate-800/80 border-slate-700/70 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                      )}>
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <span className={cn("text-xs font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                        Properties Managed
                      </span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full border font-mono font-bold text-xs shadow-inner",
                        isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                      )}>
                        3
                      </span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full border font-mono font-bold text-xs shadow-sm",
                        isDark ? "bg-indigo-500/15 border-indigo-500/35 text-indigo-300" : "bg-indigo-100 border-indigo-300 text-indigo-800"
                      )}>
                        5
                      </span>
                    </div>

                    <div className="col-span-3 text-center flex justify-center">
                      <span className={cn(
                        "px-3.5 py-1 rounded-full border font-mono font-bold text-xs shadow-sm",
                        isDark ? "bg-violet-500/15 border-violet-500/35 text-violet-300" : "bg-violet-100 border-violet-300 text-violet-800"
                      )}>
                        Unlimited (6+)
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Tenant & Lease Directory */}
                  <div className={cn(
                    "grid grid-cols-12 gap-3 sm:gap-4 py-3.5 px-3 items-center rounded-xl transition-colors duration-200",
                    isDark ? "hover:bg-slate-800/30" : "hover:bg-indigo-50/50"
                  )}>
                    <div className="col-span-5 flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm",
                        isDark ? "bg-slate-800/80 border-slate-700/70 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                      )}>
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <span className={cn("text-xs font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
                        Tenant &amp; Lease Directory
                      </span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400" : "bg-indigo-100 border-indigo-300 text-indigo-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400" : "bg-indigo-100 border-indigo-300 text-indigo-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <div className="col-span-3 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400" : "bg-indigo-100 border-indigo-300 text-indigo-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Maintenance Ticket Dispatch */}
                  <div className={cn(
                    "grid grid-cols-12 gap-3 sm:gap-4 py-3.5 px-3 items-center rounded-xl transition-colors duration-200",
                    isDark ? "hover:bg-slate-800/30" : "hover:bg-indigo-50/50"
                  )}>
                    <div className="col-span-5 flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm",
                        isDark ? "bg-slate-800/80 border-slate-700/70 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                      )}>
                        <Zap className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <span className={cn("text-xs font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
                        Maintenance Ticket Dispatch
                      </span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400" : "bg-indigo-100 border-indigo-300 text-indigo-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400" : "bg-indigo-100 border-indigo-300 text-indigo-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <div className="col-span-3 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400" : "bg-indigo-100 border-indigo-300 text-indigo-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Financial & Revenue Analytics */}
                  <div className={cn(
                    "grid grid-cols-12 gap-3 sm:gap-4 py-3.5 px-3 items-center rounded-xl transition-colors duration-200",
                    isDark ? "hover:bg-slate-800/30" : "hover:bg-indigo-50/50"
                  )}>
                    <div className="col-span-5 flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm",
                        isDark ? "bg-slate-800/80 border-slate-700/70 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                      )}>
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <span className={cn("text-xs font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
                        Financial &amp; Revenue Analytics
                      </span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <span className={cn("font-mono text-base select-none", isDark ? "text-slate-600" : "text-slate-400")}>—</span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400" : "bg-indigo-100 border-indigo-300 text-indigo-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <div className="col-span-3 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400" : "bg-indigo-100 border-indigo-300 text-indigo-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>

                  {/* Row 5: Enhanced PDF & CSV Audit Exports */}
                  <div className={cn(
                    "grid grid-cols-12 gap-3 sm:gap-4 py-3.5 px-3 items-center rounded-xl transition-colors duration-200",
                    isDark ? "hover:bg-slate-800/30" : "hover:bg-indigo-50/50"
                  )}>
                    <div className="col-span-5 flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm",
                        isDark ? "bg-slate-800/80 border-slate-700/70 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                      )}>
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <span className={cn("text-xs font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
                        Enhanced PDF &amp; CSV Audit Exports
                      </span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <span className={cn("font-mono text-base select-none", isDark ? "text-slate-600" : "text-slate-400")}>—</span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400" : "bg-indigo-100 border-indigo-300 text-indigo-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <div className="col-span-3 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400" : "bg-indigo-100 border-indigo-300 text-indigo-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>

                  {/* Row 6: Priority Support & Dispatch Assistance */}
                  <div className={cn(
                    "grid grid-cols-12 gap-3 sm:gap-4 py-3.5 px-3 items-center rounded-xl transition-colors duration-200",
                    isDark ? "hover:bg-slate-800/30" : "hover:bg-indigo-50/50"
                  )}>
                    <div className="col-span-5 flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm",
                        isDark ? "bg-slate-800/80 border-slate-700/70 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                      )}>
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <span className={cn("text-xs font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
                        Priority Support &amp; Dispatch Assistance
                      </span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <span className={cn("font-mono text-base select-none", isDark ? "text-slate-600" : "text-slate-400")}>—</span>
                    </div>

                    <div className="col-span-2 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400" : "bg-indigo-100 border-indigo-300 text-indigo-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <div className="col-span-3 text-center flex justify-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full border shadow-sm",
                        isDark ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400" : "bg-indigo-100 border-indigo-300 text-indigo-700"
                      )}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>

                  {/* Row 7: Enterprise Multi-Manager Delegation & API Access */}
                  <div className={cn(
                    "grid grid-cols-12 gap-3 sm:gap-4 py-3.5 px-3 items-center rounded-xl transition-colors duration-200",
                    isDark ? "hover:bg-slate-800/30" : "hover:bg-indigo-50/50"
                  )}>
                    <div className="col-span-5 flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm",
                        isDark ? "bg-slate-800/80 border-slate-700/70 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                      )}>
                        <FolderLock className="w-3.5 h-3.5 text-violet-500" />
                      </div>
                      <span className={cn("text-xs font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
                        Enterprise Multi-Manager Delegation &amp; API Access
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
                        isDark ? "bg-violet-500/20 border-violet-400/40 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.25)]" : "bg-violet-100 border-violet-300 text-violet-800"
                      )}>
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span className="text-[10px] font-black tracking-wider uppercase">Enterprise</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Subtitle */}
                <div className={cn(
                  "pt-6 mt-4 border-t flex flex-col sm:flex-row items-center justify-between text-xs gap-2",
                  isDark ? "border-slate-800/60 text-slate-400" : "border-slate-200 text-slate-600"
                )}>
                  <span className="font-medium">Choose the plan that fits your property operations.</span>
                  <span className={cn("text-[11px]", isDark ? "text-slate-500" : "text-slate-400")}>Plans can be upgraded as your portfolio expands.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
