import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, CheckCircle2, ArrowRight, ShieldCheck, Sparkles, Building2, Calendar, CreditCard } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLanguage } from '../../context/LanguageContext';

export default function NextPaymentCard({
  dueDate,
  amount,
  isEstimate = false,
  propertyName = '',
  onPayRent,
  theme = 'dark'
}) {
  const { t } = useLanguage();
  const [now, setNow] = useState(Date.now());

  // Real-time second interval timer with automatic cleanup on unmount
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!dueDate && amount === undefined) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center rounded-3xl bg-card/40 border border-dashed border-border/80 backdrop-blur-xl h-full min-h-[300px]">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-3 border border-emerald-500/20">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-black text-foreground">{t('dashboard.allCaughtUp', "You're All Caught Up")}</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
          {t('dashboard.noPendingPayments', "No upcoming or pending rent payments at this time.")}
        </p>
      </div>
    );
  }

  const dueTime = new Date(dueDate).getTime();
  const diff = dueTime - now;

  const isOverdue = diff < 0 && !isEstimate;
  const isDueToday = !isOverdue && diff < 86400000; // Less than 24 hours

  // Time component calculations
  const absoluteDiff = Math.abs(diff);
  const days = Math.floor(absoluteDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absoluteDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absoluteDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absoluteDiff % (1000 * 60)) / 1000);

  // Circular progress math (assuming 30-day billing cycle)
  const RADIUS = 42;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~263.89
  const cycleDays = Math.min(30, Math.max(0, days));
  const progressPct = isOverdue ? 100 : Math.max(0, Math.min(100, (cycleDays / 30) * 100));
  const strokeOffset = CIRCUMFERENCE - (progressPct / 100) * CIRCUMFERENCE;

  // Status Styling Variants
  const statusConfig = isOverdue
    ? {
        badge: 'OVERDUE',
        badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-500 dark:text-rose-400',
        ringColor: 'stroke-rose-500',
        glowColor: 'from-rose-500/20 to-rose-600/5',
        accentText: 'text-rose-500',
        icon: AlertTriangle,
      }
    : isDueToday
    ? {
        badge: 'DUE TODAY',
        badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-500 dark:text-amber-400',
        ringColor: 'stroke-amber-500',
        glowColor: 'from-amber-500/20 to-amber-600/5',
        accentText: 'text-amber-500',
        icon: Clock,
      }
    : {
        badge: isEstimate ? 'ESTIMATED' : 'UPCOMING',
        badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 dark:text-emerald-400',
        ringColor: 'stroke-emerald-500',
        glowColor: 'from-emerald-500/20 to-teal-500/5',
        accentText: 'text-emerald-500 dark:text-emerald-400',
        icon: Clock,
      };

  const StatusIcon = statusConfig.icon;

  const formattedDueDate = new Date(dueDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-6 rounded-[2rem] bg-card/60 backdrop-blur-xl border border-border/80 shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-300 group">
      {/* Glossy Background Radial Glows */}
      <div className={cn(
        "absolute -top-24 -right-24 w-56 h-56 rounded-full bg-gradient-to-br blur-3xl opacity-40 transition-opacity duration-500 group-hover:opacity-70 pointer-events-none",
        statusConfig.glowColor
      )} />
      <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />

      {/* Card Header: Icon, Label, and Status Pill */}
      <div className="relative z-10 flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className={cn("p-2 rounded-xl border backdrop-blur-md transition-colors", statusConfig.badgeBg)}>
            <StatusIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground/90">
              {t('dashboard.nextPayment', 'Upcoming Payment')}
            </h3>
            {propertyName && (
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider truncate max-w-[130px]" title={propertyName}>
                {propertyName}
              </p>
            )}
          </div>
        </div>

        <span className={cn(
          "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm backdrop-blur-md flex items-center gap-1",
          statusConfig.badgeBg
        )}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
          {statusConfig.badge}
        </span>
      </div>

      {/* Centerpiece: Premium Animated Progress Ring */}
      <div className="relative z-10 flex flex-col items-center justify-center my-2">
        <div className="relative w-36 h-36 flex items-center justify-center">
          {/* Inner Glossy Glass Backplate */}
          <div className="absolute inset-2 rounded-full bg-card/40 border border-border/40 backdrop-blur-md shadow-inner" />

          {/* SVG Countdown Ring */}
          <svg className="w-full h-full -rotate-90 transform drop-shadow-md" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              className="text-muted-foreground/10"
              strokeWidth="7"
            />
            {/* Active Animated Progress Stroke */}
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              className={cn("transition-all duration-700 ease-out", statusConfig.ringColor)}
              strokeWidth="7"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
            />
          </svg>

          {/* Center Digital Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 z-20">
            {isOverdue ? (
              <>
                <span className="text-3xl font-black text-rose-500 tracking-tight leading-none">!</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 mt-1">
                  OVERDUE
                </span>
              </>
            ) : (
              <>
                <span className={cn("text-3xl font-black tracking-tight leading-none tabular-nums", statusConfig.accentText)}>
                  {days}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/80 mt-1">
                  {days === 1 ? 'DAY LEFT' : 'DAYS LEFT'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Live Sub-Timer (Hours, Minutes, Seconds Bar) */}
        {!isOverdue && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-card/60 border border-border/60 shadow-sm backdrop-blur-md"
          >
            <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-foreground">
              <span>{String(hours).padStart(2, '0')}</span>
              <span className="text-muted-foreground/40 text-[9px]">h</span>
            </div>
            <span className="text-muted-foreground/30 font-bold text-xs">:</span>
            <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-foreground">
              <span>{String(minutes).padStart(2, '0')}</span>
              <span className="text-muted-foreground/40 text-[9px]">m</span>
            </div>
            <span className="text-muted-foreground/30 font-bold text-xs">:</span>
            <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-500 dark:text-emerald-400">
              <span className="tabular-nums">{String(seconds).padStart(2, '0')}</span>
              <span className="text-muted-foreground/40 text-[9px]">s</span>
            </div>
          </motion.div>
        )}
        {isOverdue && (
          <div className="mt-3 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold text-[10px] tracking-wider uppercase">
            {days === 0 ? 'DUE TODAY' : `${days} DAY${days !== 1 ? 'S' : ''} OVERDUE`}
          </div>
        )}
      </div>

      {/* Meta Information & Rent Details */}
      <div className="relative z-10 my-3 grid grid-cols-2 gap-2 text-center">
        <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/60 backdrop-blur-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">
            {isEstimate ? 'Estimated Due' : t('dashboard.due', 'Due Date')}
          </p>
          <p className="text-xs font-black text-foreground truncate">
            {formattedDueDate}
          </p>
        </div>
        <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/60 backdrop-blur-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">
            {isEstimate ? 'Upcoming Rent' : t('dashboard.amountDue', 'Amount')}
          </p>
          <p className="text-xs font-black text-emerald-500 dark:text-emerald-400 truncate">
            ₹{(amount || 0).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Pay Rent CTA Button */}
      <div className="relative z-10 pt-1">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPayRent}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all duration-300 group/btn border border-white/20 cursor-pointer"
        >
          <CreditCard className="w-4 h-4 text-emerald-100 group-hover/btn:rotate-12 transition-transform duration-300" />
          <span>{t('dashboard.payRentNow', 'Pay Rent Now')}</span>
          <ArrowRight className="w-4 h-4 text-emerald-100 group-hover/btn:translate-x-1 transition-transform duration-300" />
        </motion.button>
      </div>
    </div>
  );
}
