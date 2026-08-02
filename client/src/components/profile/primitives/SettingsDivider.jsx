import React, { memo } from 'react';

export const SettingsDivider = memo(({ className = '' }) => (
  <hr className={`border-border/60 my-6 ${className}`} />
));

SettingsDivider.displayName = 'SettingsDivider';
export default SettingsDivider;
