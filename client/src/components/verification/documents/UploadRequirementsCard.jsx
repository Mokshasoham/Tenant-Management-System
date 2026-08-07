import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import VerificationSectionCard from '../common/VerificationSectionCard';

export const UploadRequirementsCard = ({
  requiredTypes = [],
  uploadedTypes = [],
  className = '',
}) => {
  return (
    <VerificationSectionCard title="Required Documents Checklist" subtitle="Upload all required items to submit" className={className}>
      <div className="space-y-3">
        {requiredTypes.map((req, idx) => {
          const isUploaded = uploadedTypes.includes(req.type || req);
          return (
            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center gap-3">
                {isUploaded ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
                <span className={`text-sm font-semibold ${isUploaded ? 'text-foreground line-through opacity-70' : 'text-foreground'}`}>
                  {req.name || req}
                </span>
              </div>
              <span className={`text-xs font-bold ${isUploaded ? 'text-emerald-500' : 'text-amber-500'}`}>
                {isUploaded ? 'Uploaded' : 'Pending'}
              </span>
            </div>
          );
        })}
      </div>
    </VerificationSectionCard>
  );
};

export default UploadRequirementsCard;
