import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import VerificationSectionCard from '../common/VerificationSectionCard';
import VerificationStatusBadge from '../badges/VerificationStatusBadge';
import TrustScoreBadge from '../badges/TrustScoreBadge';
import { Button } from '../../PremiumUI';
import { useLanguage } from '../../../context/LanguageContext';

export const VerificationWidget = ({
  widgetData = {},
  onActionClick,
  className = '',
}) => {
  const { t } = useLanguage();
  const profile = widgetData.profile || 'TENANT';
  const status = widgetData.status || 'DRAFT';
  const trustScore = widgetData.trustScore || 0;

  return (
    <VerificationSectionCard
      title={t('verification.trustAndVerification', 'Trust & Verification')}
      subtitle={t('verification.portalProfile', 'Portal Profile: {{profile}}', { profile })}
      icon={ShieldCheck}
      badge={<VerificationStatusBadge status={status} />}
      className={className}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">
            {t('verification.currentTrustScore', 'Current Trust Score')}
          </span>
          <TrustScoreBadge score={trustScore} />
        </div>

        {widgetData.pendingReviewCount > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-semibold">
            {t(
              'verification.verificationsAwaitingReview',
              '{{count}} verification(s) awaiting review',
              { count: widgetData.pendingReviewCount }
            )}
          </div>
        )}

        {onActionClick && (
          <Button variant="outline" onClick={onActionClick} className="w-full text-xs justify-between mt-2">
            <span>{t('verification.openVerificationPortal', 'Open Verification Portal')}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </VerificationSectionCard>
  );
};

export default VerificationWidget;
