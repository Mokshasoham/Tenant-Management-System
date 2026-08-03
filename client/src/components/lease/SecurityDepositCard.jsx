import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Calendar, Landmark, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Security Deposit Card Component (V3.0.1)
 * Manages Escrow & Security Deposit tracking with strict non-null/non-NaN safeguards.
 */
export const SecurityDepositCard = React.memo(({ lease }) => {
  const depositInfo = useMemo(() => {
    if (!lease) {
      return {
        amount: 'Not Available',
        paid: 'Not Available',
        status: 'Not Available',
        method: 'Not Available',
        expectedDate: 'Not Available',
      };
    }

    const rawDeposit = lease.depositAmount ?? lease.property?.depositAmount;
    let formattedAmount = 'Not Available';
    if (typeof rawDeposit === 'number' && !isNaN(rawDeposit) && rawDeposit > 0) {
      formattedAmount = `INR ${rawDeposit.toLocaleString('en-IN')}`;
    }

    const isActive = lease.status === 'active';
    const isCompleted = lease.status === 'expired' || lease.status === 'terminated';

    let expectedDate = 'Not Available';
    if (lease.endDate) {
      const end = new Date(lease.endDate);
      if (!isNaN(end.getTime())) {
        end.setDate(end.getDate() + 14);
        expectedDate = end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }

    return {
      amount: formattedAmount,
      paid: formattedAmount !== 'Not Available' ? formattedAmount : 'Not Available',
      status: isActive ? 'Held in Escrow' : (isCompleted ? 'Pending Refund Settlement' : 'Pending Activation'),
      method: 'Original Bank / Payment Method',
      expectedDate,
    };
  }, [lease]);

  if (!lease) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-black text-foreground uppercase tracking-wider">Security Deposit Escrow</p>
            <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mt-0.5">Escrow Safeguard &amp; Settlement Status</p>
          </div>
        </div>

        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center gap-1">
          <Lock className="w-3 h-3" /> Protected
        </span>
      </div>

      {/* Grid of Deposit Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Deposit Amount */}
        <div className="p-4 rounded-2xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Deposit Amount</p>
          <p className="text-lg font-black text-foreground">{depositInfo.amount}</p>
        </div>

        {/* Deposit Paid */}
        <div className="p-4 rounded-2xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Deposit Paid</p>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> {depositInfo.paid}
          </p>
        </div>

        {/* Refund Status */}
        <div className="p-4 rounded-2xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Escrow Status</p>
          <span className="inline-block text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
            {depositInfo.status}
          </span>
        </div>

        {/* Expected Refund Date */}
        <div className="p-4 rounded-2xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Expected Return Date</p>
          <p className="text-sm font-black text-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" /> {depositInfo.expectedDate}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

SecurityDepositCard.displayName = 'SecurityDepositCard';
export default SecurityDepositCard;
