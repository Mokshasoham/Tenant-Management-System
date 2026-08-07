import React from 'react';
import StatCard from '../../StatCard';
import { ShieldCheck } from 'lucide-react';

export const VerificationSummaryCard = ({
  verifiedCount = 0,
  totalCount = 0,
  loading = false,
}) => {
  return (
    <StatCard
      title="Verified Entities"
      value={`${verifiedCount} / ${totalCount}`}
      icon={ShieldCheck}
      color="bg-emerald-500/10"
      textColor="text-emerald-600"
      loading={loading}
    />
  );
};

export default VerificationSummaryCard;
