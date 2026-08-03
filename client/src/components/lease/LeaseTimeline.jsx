import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, Clock, Calendar, FileSignature, 
  ShieldCheck, CheckSquare, Sparkles, RefreshCw 
} from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Lease Journey Timeline Component (V3.0.1)
 * Tracks the complete lifecycle of a lease agreement dynamically based on lease status & signatures.
 */
export const LeaseTimeline = React.memo(({ lease }) => {
  const steps = useMemo(() => {
    if (!lease) return [];

    const isPending = lease.status === 'pending';
    const isActive = lease.status === 'active';
    const isCompleted = lease.status === 'expired' || lease.status === 'terminated';
    const isSignedByTenant = Boolean(lease.signature || lease.signedAt);
    
    // Calculate days remaining to check renewal availability
    let daysRemaining = 365;
    if (lease.endDate) {
      const end = new Date(lease.endDate).getTime();
      const now = Date.now();
      daysRemaining = Math.max(0, Math.ceil((end - now) / 86400000));
    }
    const isRenewalAvailable = isActive && daysRemaining <= 90;

    return [
      {
        id: 'booking_approved',
        label: 'Booking Approved',
        description: 'Reservation confirmed by management',
        icon: CheckSquare,
        status: 'completed',
      },
      {
        id: 'lease_generated',
        label: 'Lease Generated',
        description: 'Enterprise agreement prepared',
        icon: Sparkles,
        status: 'completed',
      },
      {
        id: 'tenant_signed',
        label: 'Tenant Signed',
        description: lease.signedAt ? `Signed on ${new Date(lease.signedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Pending tenant e-signature',
        icon: FileSignature,
        status: isSignedByTenant ? 'completed' : (isPending ? 'current' : 'upcoming'),
      },
      {
        id: 'manager_signed',
        label: 'Manager Counter-Signed',
        description: 'Verified & system counter-signed',
        icon: ShieldCheck,
        status: isSignedByTenant ? 'completed' : 'upcoming',
      },
      {
        id: 'lease_activated',
        label: 'Lease Activated',
        description: 'Official tenancy activated in registry',
        icon: CheckCircle2,
        status: isActive || isCompleted ? 'completed' : (isPending && isSignedByTenant ? 'current' : 'upcoming'),
      },
      {
        id: 'lease_active',
        label: 'Lease Active',
        description: isActive ? `${daysRemaining} days remaining` : 'Tenancy term active',
        icon: Calendar,
        status: isActive && !isRenewalAvailable ? 'current' : (isActive && isRenewalAvailable ? 'completed' : 'upcoming'),
      },
      {
        id: 'renewal_available',
        label: 'Renewal Window',
        description: isRenewalAvailable ? 'Eligible for annual renewal' : 'Opens 90 days before end',
        icon: RefreshCw,
        status: isRenewalAvailable ? 'current' : (isCompleted ? 'completed' : 'upcoming'),
      },
      {
        id: 'lease_completed',
        label: 'Lease Completed',
        description: isCompleted ? 'Term finished / settled' : 'Final lease closure',
        icon: CheckCircle2,
        status: isCompleted ? 'completed' : 'upcoming',
      },
    ];
  }, [lease]);

  if (!lease) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-black text-foreground uppercase tracking-wider">Lease Journey Timeline</p>
            <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mt-0.5">Real-time Lifecycle Tracker</p>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          V3.0 Enterprise
        </span>
      </div>

      {/* Grid Timeline Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';

          return (
            <div
              key={step.id}
              className={cn(
                "relative p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between",
                isCompleted && "bg-emerald-500/5 border-emerald-500/20 text-emerald-950 dark:text-emerald-100",
                isCurrent && "bg-blue-500/10 border-blue-500/30 text-blue-950 dark:text-blue-100 shadow-md ring-2 ring-blue-500/20",
                !isCompleted && !isCurrent && "bg-muted/40 border-border/60 opacity-60"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                  isCompleted && "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
                  isCurrent && "bg-blue-500/20 text-blue-700 dark:text-blue-300 animate-pulse",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground/40"
                )}>
                  Step 0{index + 1}
                </span>

                <div className={cn(
                  "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold",
                  isCompleted && "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30",
                  isCurrent && "bg-blue-600 text-white shadow-md shadow-blue-500/30",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground/40"
                )}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <p className={cn(
                  "text-xs font-black leading-snug mb-1",
                  isCompleted && "text-emerald-900 dark:text-emerald-200",
                  isCurrent && "text-blue-900 dark:text-blue-200",
                  !isCompleted && !isCurrent && "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground/70 font-medium leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
});

LeaseTimeline.displayName = 'LeaseTimeline';
export default LeaseTimeline;
