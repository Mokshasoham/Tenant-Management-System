import React from 'react';
import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';
import VerificationSectionCard from '../common/VerificationSectionCard';

export const UploadRequirementsCard = ({
  requiredTypes = [],
  uploadedTypes = [],
  documents = [],
  className = '',
}) => {
  return (
    <VerificationSectionCard title="Required Documents Checklist" subtitle="Upload all required items to submit" className={className}>
      <div className="space-y-3">
        {requiredTypes.map((req, idx) => {
          const reqType = req.type || req;
          const matchedDoc = Array.isArray(documents)
            ? documents.find((d) => d.documentType === reqType)
            : null;
          const docStatus = matchedDoc ? (matchedDoc.status || 'UPLOADED').toUpperCase() : null;
          const isUploaded = Boolean(matchedDoc) || uploadedTypes.includes(reqType);

          let statusLabel = 'Not Uploaded';
          let statusColor = 'text-muted-foreground/60';
          let IconComponent = Circle;
          let iconColor = 'text-muted-foreground/40';

          if (docStatus === 'VERIFIED') {
            statusLabel = 'Verified';
            statusColor = 'text-emerald-500';
            IconComponent = CheckCircle2;
            iconColor = 'text-emerald-500';
          } else if (docStatus === 'REJECTED') {
            statusLabel = 'Rejected';
            statusColor = 'text-rose-500';
            IconComponent = XCircle;
            iconColor = 'text-rose-500';
          } else if (docStatus === 'UPLOADED' || docStatus === 'PENDING') {
            statusLabel = 'Uploaded';
            statusColor = 'text-sky-500';
            IconComponent = Clock;
            iconColor = 'text-sky-500';
          } else if (isUploaded) {
            statusLabel = 'Uploaded';
            statusColor = 'text-emerald-500';
            IconComponent = CheckCircle2;
            iconColor = 'text-emerald-500';
          }

          return (
            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center gap-3">
                <IconComponent className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
                <span className={`text-sm font-semibold ${docStatus === 'VERIFIED' ? 'text-foreground line-through opacity-70' : 'text-foreground'}`}>
                  {req.name || req}
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
