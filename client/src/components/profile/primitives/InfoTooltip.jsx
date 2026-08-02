import React, { useState, memo } from 'react';
import { Info } from 'lucide-react';

export const InfoTooltip = memo(({ text }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-0.5"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg bg-popover text-popover-foreground border border-border text-[11px] font-medium shadow-md whitespace-nowrap">
          {text}
        </div>
      )}
    </div>
  );
});

InfoTooltip.displayName = 'InfoTooltip';
export default InfoTooltip;
