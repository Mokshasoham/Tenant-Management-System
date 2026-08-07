import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import VerificationSectionCard from '../common/VerificationSectionCard';
import VerificationStatusBadge from '../badges/VerificationStatusBadge';
import TrustScoreBadge from '../badges/TrustScoreBadge';
import { Button } from '../../PremiumUI';

export const VerificationWidget = ({
  widgetData = {},
  onActionClick,
  className = '',
}) => {
  const profile = widgetData.profile || 'TENANT';
  const status = widgetData.status || 'DRAFT';
  const trustScore = widgetData.trustScore || 0;

  return (
    <VerificationSectionCard
      title="Trust & Verification"
      subtitle={`Portal Profile: ${profile}`}
      icon={ShieldCheck}
      badge={<VerificationStatusBadge status={status} />}
      className={className}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">Current Trust Score</span>
          <TrustScoreBadge score={trustScore} />
        </div>

        {widgetData.pendingReviewCount > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-semibold">
            {widgetData.pendingReviewCount} verification(s) awaiting review
          </div>
        )}

        {onActionClick && (
          <Button variant="outline" onClick={onActionClick} className="w-full text-xs justify-between mt-2">
            <span>Open Verification Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </VerificationSectionCard>
  );
};

export default VerificationWidget;
