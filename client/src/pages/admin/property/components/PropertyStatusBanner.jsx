import React from 'react';
import { VerificationStatusBadge, RiskFlagBadge } from '../../../../components/verification';
import { AlertTriangle, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../../utils/cn';

export default function PropertyStatusBanner({ property, theme }) {
  if (!property) return null;

  return (
    <div className={cn(
      "p-4 rounded-full border shadow-2xl backdrop-blur-2xl flex flex-wrap items-center justify-between gap-4 transition-all",
      theme === 'light'
        ? "bg-white/80 border-slate-200/80 shadow-slate-200/50 text-slate-900"
        : "bg-[#0c0d15]/80 border-white/10 shadow-black/60 text-white"
    )}>
      <div className="flex items-center gap-3 pl-2 flex-wrap">
        <VerificationStatusBadge status={property.status} />
        <RiskFlagBadge risk={property.verificationPriority || 'LOW'} />
        <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
          Level {property.verificationLevel} Review
        </span>
      </div>

      <div className="flex items-center gap-6 text-xs text-muted-foreground pr-2">
        <div>
          <span>Review Queue: </span>
          <strong className={cn("font-black", theme === 'light' ? "text-slate-900" : "text-white")}>
            {property.reviewQueueStatus}
          </strong>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-500" />
          <span>SLA Target: </span>
          <strong className="text-emerald-500 font-extrabold">{property.slaRemainingHours}h Remaining</strong>
        </div>
      </div>
    </div>
  );
}
