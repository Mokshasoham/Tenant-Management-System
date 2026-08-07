import React from 'react';
import VerificationSectionCard from '../common/VerificationSectionCard';
import MiniLineChart from '../charts/MiniLineChart';
import { TrendingUp } from 'lucide-react';

export const TrustHistoryMiniChart = ({ historyData = [], className = '' }) => {
  const points = historyData.map((h) => ({ value: h.score || 0 }));

  return (
    <VerificationSectionCard title="Score History Trend" subtitle="Trust score updates over time" icon={TrendingUp} className={className}>
      <MiniLineChart dataPoints={points} height={70} />
    </VerificationSectionCard>
  );
};

export default TrustHistoryMiniChart;
