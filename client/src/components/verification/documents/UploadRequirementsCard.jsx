import React from 'react';
import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';
import VerificationSectionCard from '../common/VerificationSectionCard';
import { useLanguage } from '../../../context/LanguageContext';
import { getLocalizedStatus } from '../../../utils/statusLocalization';

export const UploadRequirementsCard = ({
  requiredTypes = [],
  uploadedTypes = [],
  documents = [],
  className = '',
}) => {
  const { t } = useLanguage();

  const getDocName = (req) => {
    const type = req.type || req;
    switch (type) {
      case 'GOVT_ID':
        return t('verification.docGovtId', 'Government Photo ID (Passport / Drivers License)');
      case 'ADDRESS_PROOF':
        return t('verification.docAddressProof', 'Utility Bill / Bank Statement / Rental Lease');
      case 'EMPLOYMENT_LETTER':
        return t('verification.docEmploymentLetter', 'Employment Verification Letter / Offer Letter');
      case 'INCOME_PROOF':
        return t('verification.docIncomeProof', 'Recent Pay Slip / Tax Returns');
      default:
        return getLocalizedStatus(type, t, 'documentType') || req.name || type;
    }
  };

  return (
    <VerificationSectionCard
      title={t('verification.documentChecklist', 'Required Documents Checklist')}
      subtitle={t('verification.documentChecklistSubtitle', 'Upload all required items to submit')}
      className={className}
    >
      <div className="space-y-3">
        {requiredTypes.map((req, idx) => {
          const reqType = req.type || req;
          const matchedDoc = Array.isArray(documents)
            ? documents.find((d) => d.documentType === reqType)
            : null;
          const docStatus = matchedDoc ? (matchedDoc.status || 'UPLOADED').toUpperCase() : null;
          const isUploaded = Boolean(matchedDoc) || uploadedTypes.includes(reqType);

          let statusLabel = t('verification.notUploaded', 'Not Uploaded');
          let statusColor = 'text-muted-foreground/60';
          let IconComponent = Circle;
          let iconColor = 'text-muted-foreground/40';

          if (docStatus === 'VERIFIED') {
            statusLabel = t('verification.verified', 'Verified');
            statusColor = 'text-emerald-500';
            IconComponent = CheckCircle2;
            iconColor = 'text-emerald-500';
          } else if (docStatus === 'REJECTED') {
            statusLabel = t('verification.rejected', 'Rejected');
            statusColor = 'text-rose-500';
            IconComponent = XCircle;
            iconColor = 'text-rose-500';
          } else if (docStatus === 'UPLOADED' || docStatus === 'PENDING') {
            statusLabel = t('verification.uploaded', 'Uploaded');
            statusColor = 'text-sky-500';
            IconComponent = Clock;
            iconColor = 'text-sky-500';
          } else if (isUploaded) {
            statusLabel = t('verification.uploaded', 'Uploaded');
            statusColor = 'text-emerald-500';
            IconComponent = CheckCircle2;
            iconColor = 'text-emerald-500';
          }

          return (
            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center gap-3">
                <IconComponent className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
                <span className={`text-sm font-semibold ${docStatus === 'VERIFIED' ? 'text-foreground line-through opacity-70' : 'text-foreground'}`}>
                  {getDocName(req)}
                </span>
              </div>
              <span className={`text-xs font-bold ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
          );
        })}
      </div>
    </VerificationSectionCard>
  );
};

export default UploadRequirementsCard;
