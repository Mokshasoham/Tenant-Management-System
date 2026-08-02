import React, { memo } from 'react';

export const SectionHeader = memo(({ title, description, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h3 className="text-sm font-black text-foreground uppercase tracking-wider">{title}</h3>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
));

SectionHeader.displayName = 'SectionHeader';
export default SectionHeader;
