import React from 'react';
import { CheckCircle2, AlertCircle, Eye, Trash2 } from 'lucide-react';
import { getDocumentIcon } from '../../../utils/documentIcons';
import StatusBadge from '../../profile/primitives/StatusBadge';
import { useLanguage } from '../../../context/LanguageContext';
import { getLocalizedStatus } from '../../../utils/statusLocalization';

export const DocumentPreviewCard = ({
  document = {},
  onView,
  onRemove,
  className = '',
}) => {
  const { t, formatDate } = useLanguage();
  const statusVariant =
    document.status === 'VERIFIED' ? 'success' : document.status === 'REJECTED' ? 'error' : 'warning';

  const docDateStr = document.uploadedAt
    ? formatDate(document.uploadedAt)
    : t('verification.recentActivity', 'recently');

  return (
    <div className={`p-4 rounded-2xl border border-border bg-card shadow-sm flex items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="p-3 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
          {getDocumentIcon(document.type || document.documentType || document.filename)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground truncate">
            {document.filename || document.type || document.documentType || t('verification.documents', 'Document')}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('verification.uploaded', 'Uploaded')} {docDateStr}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <StatusBadge label={getLocalizedStatus(document.status || 'PENDING', t, 'verification')} variant={statusVariant} />
        {onView && (
          <button
            type="button"
            onClick={() => onView(document)}
            title={t('common.view', 'View')}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(document)}
            title={t('verification.removeFile', 'Remove File')}
            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default DocumentPreviewCard;
