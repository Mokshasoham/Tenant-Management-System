import React, { memo } from 'react';

export const InputLabel = memo(({ label, required, tooltip }) => (
  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1">
    <span>{label}</span>
    {required && <span className="text-rose-500">*</span>}
  </label>
));

InputLabel.displayName = 'InputLabel';
export default InputLabel;
