import React from 'react';
import { VerificationStatusBadge, RiskFlagBadge } from '../../../../components/verification';
import { AlertTriangle, Clock, ShieldCheck } from 'lucide-react';

export default function PropertyStatusBanner({ property }) {
  if (!property) return null;

  return (
    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <VerificationStatusBadge status={property.status} />
        <RiskFlagBadge risk={property.verificationPriority || 'LOW'} />
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
          Level {property.verificationLevel} Review
        </span>
      </div>

      <div className="flex items-center gap-6 text-xs text-slate-400">
        <div>
          <span>Review Queue: </span>
          <strong className="text-slate-200">{property.reviewQueueStatus}</strong>
        </div>
        <div>
          <span>SLA Target: </span>
          <strong className="text-emerald-400 font-extrabold">{property.slaRemainingHours}h Remaining</strong>
        </div>
      </div>
    </div>
  );
}
