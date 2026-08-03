import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Calendar, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Lease Renewal Center Component (V3.0.1)
 * Handles tenancy extension, renewal window eligibility, and automated renewal triggers.
 */
export const LeaseRenewalCard = React.memo(({ lease, onRenew }) => {
  const renewalInfo = useMemo(() => {
    if (!lease || !lease.endDate) {
      return {
        daysRemaining: 'Not Available',
        isEligible: false,
        renewalWindow: 'Opens 90 days prior to expiry',
        status: 'Locked',
      };
    }

    const end = new Date(lease.endDate).getTime();
    if (isNaN(end)) {
      return {
        daysRemaining: 'Not Available',
        isEligible: false,
        renewalWindow: 'Opens 90 days prior to expiry',
        status: 'Locked',
      };
    }

    const now = Date.now();
    const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
    const isActive = lease.status === 'active';

    // Renewal eligible when active & within 90 days of expiry
    const isEligible = isActive && daysLeft <= 90 && daysLeft > 0;

    let status = 'Upcoming';
    if (isEligible) status = 'Open for Renewal';
    else if (daysLeft === 0) status = 'Lease Expired';
    else if (!isActive) status = 'Locked';

    return {
      daysRemaining: `${daysLeft} Days`,
      isEligible,
      renewalWindow: '90 Days Prior to Expiration',
      status,
    };
  }, [lease]);

  if (!lease) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-black text-foreground uppercase tracking-wider">Lease Renewal Center</p>
            <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mt-0.5">Annual Extension &amp; Term Terms</p>
          </div>
        </div>

        <span className={cn(
          "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
          renewalInfo.isEligible 
            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
            : "bg-muted text-muted-foreground border-border"
        )}>
          {renewalInfo.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Days Remaining */}
        <div className="p-4 rounded-2xl bg-muted/30 border border-border">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Time Remaining</p>
          <p className="text-lg font-black text-foreground">{renewalInfo.daysRemaining}</p>
        </div>

        {/* Renewal Eligibility */}
        <div className="p-4 rounded-2xl bg-muted/30 border border-border">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Renewal Eligibility</p>
          <p className={cn(
            "text-sm font-black uppercase tracking-wider",
            renewalInfo.isEligible ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/70"
          )}>
            {renewalInfo.isEligible ? 'Eligible for Renewal' : 'Not Eligible Yet'}
          </p>
        </div>

        {/* Renewal Window */}
        <div className="p-4 rounded-2xl bg-muted/30 border border-border">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Renewal Window</p>
          <p className="text-xs font-black text-foreground">{renewalInfo.renewalWindow}</p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground/70 font-medium">
          {renewalInfo.isEligible 
            ? 'Your tenancy is inside the active renewal window. You can extend your lease for another 12-month term.' 
            : 'Renewal window opens automatically 90 days before your current lease term expires.'}
        </p>

        {renewalInfo.isEligible ? (
          <button
            onClick={onRenew}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 shrink-0"
          >
            <Sparkles className="w-4 h-4" /> Renew Lease Term <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <span className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-muted border border-border text-muted-foreground/50 text-[10px] font-black uppercase tracking-widest text-center shrink-0">
            Renewal Not Available Yet
          </span>
        )}
      </div>
    </motion.div>
  );
});

LeaseRenewalCard.displayName = 'LeaseRenewalCard';
export default LeaseRenewalCard;
