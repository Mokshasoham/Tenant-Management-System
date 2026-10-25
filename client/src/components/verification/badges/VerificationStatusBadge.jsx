import React from 'react';
import StatusBadge from '../../profile/primitives/StatusBadge';
import { VERIFICATION_STATUS_CONFIG } from '../../../constants/verification/status';
import { useLanguage } from '../../../context/LanguageContext';
import { getLocalizedStatus } from '../../../utils/statusLocalization';

export const VerificationStatusBadge = ({ status = 'DRAFT', className = '' }) => {
  const { t } = useLanguage();
  const config = VERIFICATION_STATUS_CONFIG[String(status).toUpperCase()] || VERIFICATION_STATUS_CONFIG.DRAFT;
  const localizedLabel = getLocalizedStatus(status, t, 'verification') || config.label;

  return <StatusBadge label={localizedLabel} variant={config.variant} className={className} />;
};

export default VerificationStatusBadge;
