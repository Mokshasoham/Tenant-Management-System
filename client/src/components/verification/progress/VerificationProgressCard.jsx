import React from 'react';
import { ShieldCheck, Clock } from 'lucide-react';
import VerificationSectionCard from '../common/VerificationSectionCard';
import VerificationStatusBadge from '../badges/VerificationStatusBadge';
import CircularProgress from '../charts/CircularProgress';
import { calculateStepProgress } from '../../../utils/verificationHelpers';

export const VerificationProgressCard = ({
  verification = {},
  completedStepsCount = 0,
  totalStepsCount = 4,
  className = '',
}) => {
  const pct = calculateStepProgress(completedStepsCount, totalStepsCount);

  return (
    <VerificationSectionCard
      title="Verification Status"
      subtitle={verification.verificationNumber ? `ID: ${verification.verificationNumber}` : 'Draft Submission'}
      icon={ShieldCheck}
      badge={<VerificationStatusBadge status={verification.status || 'DRAFT'} />}
      className={className}
    >
      <div className="flex items-center justify-between gap-6 py-2">
        <div>
          <p className="text-2xl font-black text-foreground">{pct}% Completed</p>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            {completedStepsCount} of {totalStepsCount} required verification steps completed
          </p>
          {verification.sla?.targetReviewAt && (
            <div className="flex items-center gap-1.5 text-xs text-amber-500 font-semibold mt-3">
              <Clock className="w-3.5 h-3.5" />
              <span>Target Review: {new Date(verification.sla.targetReviewAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <CircularProgress value={pct} size={70} strokeWidth={7}>
          <span className="text-xs font-black text-foreground">{pct}%</span>
        </CircularProgress>
      </div>
    </VerificationSectionCard>
  );
};

export default VerificationProgressCard;
