import React from 'react';
import StatCard from '../../StatCard';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export const VerificationSummaryCard = ({
  verifiedCount = 0,
  totalCount = 0,
  loading = false,
}) => {
  const { t } = useLanguage();

  return (
    <StatCard
      title={t('verification.verifiedEntities', 'Verified Entities')}
      value={`${verifiedCount} / ${totalCount}`}
      icon={ShieldCheck}
      color="bg-emerald-500/10"
      textColor="text-emerald-600"
      loading={loading}
    />
  );
};

export default VerificationSummaryCard;
