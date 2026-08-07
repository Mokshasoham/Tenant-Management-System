import React from 'react';
import StatusBadge from '../../profile/primitives/StatusBadge';
import { VERIFICATION_STATUS_CONFIG } from '../../../constants/verification/status';

export const VerificationStatusBadge = ({ status = 'DRAFT', className = '' }) => {
  const config = VERIFICATION_STATUS_CONFIG[status.toUpperCase()] || VERIFICATION_STATUS_CONFIG.DRAFT;
  return <StatusBadge label={config.label} variant={config.variant} className={className} />;
};

export default VerificationStatusBadge;
