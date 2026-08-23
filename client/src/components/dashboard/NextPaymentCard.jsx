import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, CheckCircle2, ArrowRight, Building2, CreditCard } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLanguage } from '../../context/LanguageContext';

export default function NextPaymentCard({
  dueDate,
  amount,
  rentAmount,
  lateFee,
  daysLate,
  totalDue,
  lateFeePerDay = 100,
  status,
  isOverdue: isOverdueProp,
  isDueToday: isDueTodayProp,
  isEstimate = false,
  isConfirmed = false,
  propertyName = '',
  isAutoPayActive = false,
  onPayRent,
  theme = 'dark'
}) {
  const { t } = useLanguage();
  const [now, setNow] = useState(Date.now());
  const [isRingHovered, setIsRingHovered] = useState(false);
  const [hoverKey, setHoverKey] = useState(0);

  // Real-time second interval timer with automatic cleanup on unmount
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Safe Handling for Missing Data
  if (!dueDate && (amount === undefined || amount === null) && (rentAmount === undefined || rentAmount === null)) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center rounded-[2rem] bg-card/60 backdrop-blur-xl border border-border/80 shadow-[0_20px_50px_rgba(0,0,0,0.2)] h-full min-h-[340px]">
        <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-3 border border-border/80">
          <Building2 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-wider text-foreground">No Active Lease</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
          No active lease agreements or upcoming payments scheduled.
        </p>
      </div>
    );
  }

  if (!dueDate) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center rounded-[2rem] bg-card/60 backdrop-blur-xl border border-border/80 shadow-[0_20px_50px_rgba(0,0,0,0.2)] h-full min-h-[340px]">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-3 border border-amber-500/20">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Payment Schedule Unavailable</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
          The payment cycle schedule for this lease could not be determined.
        </p>
      </div>
    );
  }

  const dueObj = new Date(dueDate);
  const nowObj = new Date(now);

  const dueStart = Date.UTC(dueObj.getUTCFullYear(), dueObj.getUTCMonth(), dueObj.getUTCDate(), 0, 0, 0, 0);
  const dueDeadline = Date.UTC(dueObj.getUTCFullYear(), dueObj.getUTCMonth(), dueObj.getUTCDate(), 23, 59, 59, 999);
  const todayStart = Date.UTC(nowObj.getUTCFullYear(), nowObj.getUTCMonth(), nowObj.getUTCDate(), 0, 0, 0, 0);

  // Exact lifecycle evaluation
  const isOverdue = isOverdueProp ?? (status === 'overdue' || todayStart > dueStart);
  const isDueToday = !isOverdue && (isDueTodayProp ?? (status === 'due' || todayStart === dueStart));

  const calculatedDaysLate = daysLate !== undefined 
    ? daysLate 
    : (isOverdue ? Math.max(1, Math.floor((todayStart - dueStart) / (1000 * 60 * 60 * 24))) : 0);

  const baseRent = rentAmount ?? amount ?? 0;
  const calculatedLateFee = lateFee !== undefined 
    ? lateFee 
    : (isOverdue ? calculatedDaysLate * lateFeePerDay : 0);

  const finalTotalDue = totalDue !== undefined 
    ? totalDue 
    : (baseRent + (isOverdue ? calculatedLateFee : 0));

  // Time component calculations for upcoming countdown
  const diff = dueDeadline - now;
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
        headerTitle: 'OVERDUE PAYMENT',
        badge: 'OVERDUE',
        badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-500 dark:text-rose-400',
        ringColor: 'stroke-rose-500',
        glowColor: 'from-rose-500/20 to-rose-600/5',
        accentText: 'text-rose-500',
        hoverDropShadow: 'group-hover/ring:drop-shadow-[0_0_12px_rgba(244,63,94,0.55)]',
        auraBg: 'group-hover/ring:bg-rose-500/10 group-hover/ring:border-rose-500/30',
        textGlow: 'group-hover/ring:drop-shadow-[0_0_8px_rgba(244,63,94,0.45)]',
        backplateHover: 'group-hover/ring:border-rose-500/30 group-hover/ring:bg-card/75 group-hover/ring:shadow-[0_0_20px_rgba(244,63,94,0.15)]',
        icon: AlertTriangle,
        btnGradient: 'from-rose-600 via-rose-500 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-rose-500/25',
      }
    : isDueToday
    ? {
        headerTitle: 'PAYMENT DUE TODAY',
        badge: 'DUE TODAY',
        badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-500 dark:text-amber-400',
        ringColor: 'stroke-amber-500',
        glowColor: 'from-amber-500/20 to-amber-600/5',
        accentText: 'text-amber-500',
        hoverDropShadow: 'group-hover/ring:drop-shadow-[0_0_12px_rgba(245,158,11,0.55)]',
        auraBg: 'group-hover/ring:bg-amber-500/10 group-hover/ring:border-amber-500/30',
        textGlow: 'group-hover/ring:drop-shadow-[0_0_8px_rgba(245,158,11,0.45)]',
        backplateHover: 'group-hover/ring:border-amber-500/30 group-hover/ring:bg-card/75 group-hover/ring:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
        icon: Clock,
        btnGradient: 'from-amber-500 via-amber-600 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/25',
      }
    : {
        headerTitle: t('dashboard.nextPayment', 'Next Payment'),
        badge: isEstimate ? 'ESTIMATED' : 'CONFIRMED',
        badgeBg: isEstimate
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 dark:text-emerald-400'
          : 'bg-teal-500/15 border-teal-500/35 text-teal-400 dark:text-teal-300',
        ringColor: 'stroke-emerald-500',
        glowColor: 'from-emerald-500/20 to-teal-500/5',
        accentText: 'text-emerald-500 dark:text-emerald-400',
        hoverDropShadow: 'group-hover/ring:drop-shadow-[0_0_12px_rgba(16,185,129,0.55)]',
        auraBg: 'group-hover/ring:bg-emerald-500/10 group-hover/ring:border-emerald-500/30',
        textGlow: 'group-hover/ring:drop-shadow-[0_0_8px_rgba(16,185,129,0.45)]',
        backplateHover: 'group-hover/ring:border-emerald-500/30 group-hover/ring:bg-card/75 group-hover/ring:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
        icon: Clock,
        btnGradient: 'from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/25',
      };

  const StatusIcon = statusConfig.icon;

  // Format date consistently in UTC to avoid 1-day shifting in negative timezones
  const formattedDueDate = new Date(dueDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
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
            <h3 className={cn(
              "text-xs font-black uppercase tracking-widest",
              isOverdue ? "text-rose-500 dark:text-rose-400" : "text-foreground/90"
            )}>
              {statusConfig.headerTitle}
            </h3>
            {propertyName && (
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider truncate max-w-[130px]" title={propertyName}>
                {propertyName}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className={cn(
            "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm backdrop-blur-md flex items-center gap-1",
            statusConfig.badgeBg
          )}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
            {statusConfig.badge}
          </span>
          {isAutoPayActive ? (
            <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              Auto-Pay Active
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-muted/40 border border-border text-muted-foreground/50">
              Auto-Pay Off
            </span>
          )}
        </div>
      </div>

      {/* Centerpiece: Animated Progress Ring */}
      <div className="relative z-10 flex flex-col items-center justify-center my-2">
        <div
          onMouseEnter={() => {
            setIsRingHovered(true);
            setHoverKey(prev => prev + 1);
          }}
          onMouseLeave={() => {
            setIsRingHovered(false);
          }}
          className="group/ring relative w-36 h-36 flex items-center justify-center cursor-pointer select-none transition-transform duration-300 ease-out hover:scale-[1.045]"
        >
          {/* Ambient Aura Ring */}
          <div
            className={cn(
              "absolute -inset-2.5 rounded-full border border-transparent opacity-0 group-hover/ring:opacity-100 blur-sm scale-95 group-hover/ring:scale-105 transition-all duration-500 ease-out pointer-events-none",
              statusConfig.auraBg
            )}
          />

          {/* Inner Glossy Glass Backplate */}
          <div
            className={cn(
              "absolute inset-2 rounded-full bg-card/40 border border-border/40 backdrop-blur-md shadow-inner transition-all duration-300 ease-out",
              statusConfig.backplateHover
            )}
          />

          {/* SVG Countdown Ring */}
          <svg
            className={cn(
              "w-full h-full -rotate-90 transform drop-shadow-md transition-all duration-300 ease-out",
              statusConfig.hoverDropShadow
            )}
            viewBox="0 0 100 100"
          >
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              className="text-muted-foreground/10 group-hover/ring:text-muted-foreground/20 transition-colors duration-300"
              strokeWidth="7"
            />
            {/* Active Animated Progress Stroke */}
            <motion.circle
              key={`progress-stroke-${hoverKey}`}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              className={cn(
                "group-hover/ring:brightness-125",
                statusConfig.ringColor
              )}
              strokeWidth="7"
              strokeDasharray={CIRCUMFERENCE}
              strokeLinecap="round"
              initial={{
                strokeDashoffset: isRingHovered ? CIRCUMFERENCE : strokeOffset
              }}
              animate={{
                strokeDashoffset: strokeOffset
              }}
              transition={{
                duration: isRingHovered ? 1.35 : 0.6,
                ease: [0.22, 1, 0.36, 1]
              }}
            />
          </svg>

          {/* Center Digital Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 z-20">
            {isOverdue ? (
              <>
                <span className={cn("text-3xl font-black tracking-tight leading-none transition-all duration-300", statusConfig.accentText, statusConfig.textGlow)}>
                  !
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 mt-1">
                  OVERDUE
                </span>
              </>
            ) : isDueToday ? (
              <>
                <span className={cn("text-3xl font-black tracking-tight leading-none tabular-nums transition-all duration-300", statusConfig.accentText, statusConfig.textGlow)}>
                  0
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 mt-1">
                  DUE TODAY
                </span>
              </>
            ) : (
              <>
                <span className={cn("text-3xl font-black tracking-tight leading-none tabular-nums transition-all duration-300", statusConfig.accentText, statusConfig.textGlow)}>
                  {days}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/80 group-hover/ring:text-foreground/90 transition-colors duration-300 mt-1">
                  {days === 1 ? 'DAY LEFT' : 'DAYS LEFT'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Live Sub-Timer (Hours, Minutes, Seconds Bar) */}
        {!isOverdue && !isDueToday && (
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
          <div className="mt-3 px-3.5 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-500 dark:text-rose-400 font-black text-[10px] tracking-wider uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>{calculatedDaysLate === 1 ? '1 DAY OVERDUE' : `${calculatedDaysLate} DAYS OVERDUE`}</span>
          </div>
        )}

        {isDueToday && (
          <div className="mt-3 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400 font-black text-[10px] tracking-wider uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>PAYMENT DUE TODAY</span>
          </div>
        )}
      </div>

      {/* Meta Information & Financial Breakdown */}
      {isOverdue ? (
        <div className="relative z-10 my-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/60 backdrop-blur-sm">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">
                Monthly Rent
              </p>
              <p className="text-xs font-black text-foreground truncate">
                ₹{baseRent.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 backdrop-blur-sm">
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-500/80 mb-0.5">
                Late Fee ({calculatedDaysLate}d)
              </p>
              <p className="text-xs font-black text-rose-500 dark:text-rose-400 truncate">
                +₹{calculatedLateFee.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-center flex items-center justify-between px-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-300">
              Total Due:
            </span>
            <span className="text-sm font-black text-rose-600 dark:text-rose-300">
              ₹{finalTotalDue.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      ) : (
        <div className="relative z-10 my-3 grid grid-cols-2 gap-2 text-center">
          <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/60 backdrop-blur-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">
              {isEstimate ? 'Estimated Due' : t('dashboard.due', 'Due Date')}
            </p>
            <p className="text-xs font-black text-foreground truncate">
              {isDueToday ? 'Today' : formattedDueDate}
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/60 backdrop-blur-sm">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-0.5">
              {isEstimate ? 'Upcoming Rent' : t('dashboard.amountDue', 'Amount')}
            </p>
            <p className="text-xs font-black text-emerald-500 dark:text-emerald-400 truncate">
              ₹{baseRent.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      )}

      {/* Pay Rent CTA Button */}
      <div className="relative z-10 pt-1">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPayRent}
          className={cn(
            "w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r text-white font-black text-sm tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all duration-300 group/btn border border-white/20 cursor-pointer",
            statusConfig.btnGradient
          )}
        >
          <CreditCard className="w-4 h-4 text-white group-hover/btn:rotate-12 transition-transform duration-300" />
          <span>
            {isOverdue 
              ? `Pay Rent Now (₹${finalTotalDue.toLocaleString('en-IN')})` 
              : t('dashboard.payRentNow', 'Pay Rent Now')}
          </span>
          <ArrowRight className="w-4 h-4 text-white group-hover/btn:translate-x-1 transition-transform duration-300" />
        </motion.button>
      </div>
    </div>
  );
}
