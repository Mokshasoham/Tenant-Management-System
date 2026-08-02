import React, { memo } from 'react';
import { CheckCircle2, AlertCircle, Clock, ShieldCheck } from 'lucide-react';

const VARIANT_CONFIG = {
  success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-600 dark:text-amber-400', icon: Clock },
  error: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-600 dark:text-rose-400', icon: AlertCircle },
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-600 dark:text-blue-400', icon: ShieldCheck },
  neutral: { bg: 'bg-muted', border: 'border-border', text: 'text-muted-foreground', icon: null }
};

export const StatusBadge = memo(({ label, variant = 'neutral', icon = true, className = '' }) => {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.neutral;
  const IconComponent = icon ? config.icon : null;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold capitalize ${config.bg} ${config.border} ${config.text} ${className}`}>
      {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
      {label}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';
export default StatusBadge;
