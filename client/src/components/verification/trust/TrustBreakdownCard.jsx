import React from 'react';
import VerificationSectionCard from '../common/VerificationSectionCard';
import MiniBarChart from '../charts/MiniBarChart';
import { BarChart3 } from 'lucide-react';

export const TrustBreakdownCard = ({ breakdownItems = [], className = '' }) => {
  return (
    <VerificationSectionCard title="Trust Score Breakdown" subtitle="Components contributing to your trust score" icon={BarChart3} className={className}>
      <MiniBarChart items={breakdownItems} />
    </VerificationSectionCard>
  );
};

export default TrustBreakdownCard;
