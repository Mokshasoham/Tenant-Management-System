import React from 'react';
import FileUploader from '../common/FileUploader';
import VerificationSectionCard from '../common/VerificationSectionCard';
import { FileText } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export const DocumentUploadCard = ({
  template = {},
  onUpload,
  disabled = false,
  className = '',
}) => {
  const { t } = useLanguage();

  return (
    <VerificationSectionCard
      title={template.name || t('verification.documents', 'Document Upload')}
      subtitle={template.description || t('verification.step3PropSubtitle', 'Upload clear copy for verification')}
      icon={FileText}
      badge={template.required ? <span className="text-xs font-bold text-rose-500">{t('verification.requiredBadge', '*Required')}</span> : null}
      className={className}
    >
      <FileUploader
        onFileSelect={(file) => onUpload && onUpload(template.code || 'DOC', file, template)}
        disabled={disabled}
        hint={t('verification.allowedFormatsHint', 'Allowed: {{formats}} up to {{size}}MB', {
          formats: (template.allowedFormats || ['pdf', 'png', 'jpg']).join(', '),
          size: template.maxSizeBytes || 10,
        })}
      />
    </VerificationSectionCard>
  );
};

export default DocumentUploadCard;
