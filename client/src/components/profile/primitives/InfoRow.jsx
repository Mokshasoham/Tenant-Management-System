import React, { memo } from 'react';

export const InfoRow = memo(({ label, value, icon: Icon, action }) => (
  <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground/50" />}
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-foreground">{value || '—'}</span>
      {action && <div>{action}</div>}
    </div>
  </div>
));

InfoRow.displayName = 'InfoRow';
export default InfoRow;
