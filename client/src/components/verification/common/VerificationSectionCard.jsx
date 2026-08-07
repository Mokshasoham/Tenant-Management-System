import React from 'react';
import SettingsCard from '../../profile/primitives/SettingsCard';

export const VerificationSectionCard = ({ children, ...props }) => {
  return (
    <SettingsCard className="glass-card hover-lift transition-all duration-300" {...props}>
      {children}
    </SettingsCard>
  );
};

export default VerificationSectionCard;
