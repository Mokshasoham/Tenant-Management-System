import React, { memo } from 'react';
import { Lock } from 'lucide-react';

export const ReadOnlyField = memo(({ label, value, icon: Icon }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />}
      <input
        type="text"
        readOnly
        disabled
        value={value || ''}
        className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-10 py-3 rounded-xl bg-muted/60 border border-border/60 text-foreground/70 text-sm cursor-not-allowed select-all`}
      />
      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
    </div>
  </div>
));

ReadOnlyField.displayName = 'ReadOnlyField';
export default ReadOnlyField;
