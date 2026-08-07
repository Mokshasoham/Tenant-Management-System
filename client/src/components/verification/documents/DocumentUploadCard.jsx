import React from 'react';
import FileUploader from '../common/FileUploader';
import VerificationSectionCard from '../common/VerificationSectionCard';
import { FileText } from 'lucide-react';

export const DocumentUploadCard = ({
  template = {},
  onUpload,
  disabled = false,
  className = '',
}) => {
  return (
    <VerificationSectionCard
      title={template.name || 'Document Upload'}
      subtitle={template.description || 'Upload clear copy for verification'}
      icon={FileText}
      badge={template.required ? <span className="text-xs font-bold text-rose-500">*Required</span> : null}
      className={className}
    >
      <FileUploader
        onFileSelect={(file) => onUpload && onUpload(template.code || 'DOC', file, template)}
        disabled={disabled}
        hint={`Allowed: ${(template.allowedFormats || ['pdf', 'png', 'jpg']).join(', ')} up to ${template.maxSizeBytes || 10}MB`}
      />
    </VerificationSectionCard>
  );
};

export default DocumentUploadCard;
