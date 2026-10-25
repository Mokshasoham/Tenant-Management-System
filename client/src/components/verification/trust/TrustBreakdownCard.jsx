import React from 'react';
import VerificationSectionCard from '../common/VerificationSectionCard';
import MiniBarChart from '../charts/MiniBarChart';
import { BarChart3 } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export const TrustBreakdownCard = ({ breakdownItems = [], className = '' }) => {
  const { t } = useLanguage();

  return (
    <VerificationSectionCard
      title={t('verification.trustBreakdownTitle', 'Trust Score Breakdown')}
      subtitle={t('verification.trustBreakdownSubtitle', 'Components contributing to your trust score')}
      icon={BarChart3}
      className={className}
    >
      <MiniBarChart items={breakdownItems} />
    </VerificationSectionCard>
  );
};

export default TrustBreakdownCard;
