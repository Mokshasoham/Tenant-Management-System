import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Folder, CheckCircle, Clock, XCircle, AlertTriangle, FileQuestion, RefreshCw } from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { trackEvent, VERIFICATION_EVENTS } from '../../utils/verificationAnalytics';
import getVerificationMapper from '../../mappers/verificationMapperFactory';
import { MOCK_DOCUMENT_CATEGORIES, MOCK_REQUIRED_DOCUMENTS } from '../../mocks/propertyVerificationMock';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  DocumentUploadCard,
  DocumentPreviewCard,
  VerificationEmptyState,
} from '../../components/verification';
import { Button } from '../../components/PremiumUI';

export default function PropertyVerificationDocuments() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('propertyId') || '';
  const { activeVerification, loadPropertyVerification } = useVerificationContext();
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    if (propertyId && String(activeVerification?.entityId) !== String(propertyId)) {
      loadPropertyVerification(propertyId);
    }
  }, [propertyId, activeVerification?.entityId, loadPropertyVerification]);

  const propertyMapper = getVerificationMapper('PROPERTY');
  const documents = propertyMapper.mapDocuments(activeVerification?.documents);

  const filteredDocs =
    selectedCategory === 'ALL'
      ? documents
      : documents.filter((d) => (d.category || 'OWNERSHIP') === selectedCategory);

  // Document KPI calculation
  const uploadedCount = documents.filter((d) => d.status === 'VERIFIED' || d.status === 'UPLOADED').length;
  const pendingCount = documents.filter((d) => d.status === 'PENDING' || d.status === 'DRAFT').length;
  const rejectedCount = documents.filter((d) => d.status === 'REJECTED').length;
  const expiredCount = documents.filter((d) => d.status === 'EXPIRED').length;
  const requiredTypesCount = MOCK_REQUIRED_DOCUMENTS.length;
  const missingCount = Math.max(0, requiredTypesCount - uploadedCount);

  const getCategoryLabel = (cat) => {
    switch (cat?.key || cat) {
      case 'ALL':
        return t('verification.allDocuments', 'All Documents');
      case 'OWNERSHIP':
        return t('verification.ownershipCategory', 'Ownership');
      case 'LEGAL':
        return t('verification.legalCategory', 'Legal & Approvals');
      case 'TAX':
        return t('verification.taxCategory', 'Tax Compliance');
      case 'UTILITY':
        return t('verification.utilityCategory', 'Utilities');
      case 'PHOTOS':
        return t('verification.photosCategory', 'Property Photos');
      case 'SAFETY':
        return t('verification.safetyCategory', 'Safety & NOC');
      case 'OTHER':
        return t('verification.otherCategory', 'Other');
      default:
        return cat?.label || cat?.key || cat;
    }
  };

  const handleCategorySelect = (key) => {
    setSelectedCategory(key);
    trackEvent(VERIFICATION_EVENTS.PROPERTY_DOCUMENT, { category: key });
  };

  return (
    <div className="p-6 sm:p-10 space-y-8">
      <VerificationPageHeader
        title={t('verification.propertyDocWorkspaceTitle', 'Property Document Workspace')}
        subtitle={t(
          'verification.propertyDocWorkspaceSubtitle',
          'Manage title deeds, property tax receipts, occupancy certificates, utility bills, and safety NOCs'
        )}
        icon={FileText}
        breadcrumbs={[
          { label: t('verification.propOperations', 'Property Operations'), href: '/properties' },
          {
            label: t('nav.propertyVerification', 'Property Verification'),
            href: propertyId ? `/property/verification?propertyId=${propertyId}` : '/property/verification',
          },
          { label: t('verification.documents', 'Documents') },
        ]}
      />

      {/* 5 KPI Summary Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground">
              {t('verification.uploaded', 'Uploaded')}
            </p>
            <p className="text-base font-black text-foreground">{uploadedCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground">
              {t('verification.pending', 'Pending')}
            </p>
            <p className="text-base font-black text-foreground">{pendingCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
            <XCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground">
              {t('verification.rejected', 'Rejected')}
            </p>
            <p className="text-base font-black text-foreground">{rejectedCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground">
              {t('verification.expired', 'Expired')}
            </p>
            <p className="text-base font-black text-foreground">{expiredCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-border bg-card flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="p-2 rounded-xl bg-slate-500/10 text-slate-500">
            <FileQuestion className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground">
              {t('verification.missing', 'Missing')}
            </p>
            <p className="text-base font-black text-foreground">{missingCount}</p>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
        {MOCK_DOCUMENT_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => handleCategorySelect(cat.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === cat.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted'
            }`}
          >
            {getCategoryLabel(cat)}
          </button>
        ))}
      </div>

      {/* Upload Zone */}
      <DocumentUploadCard
        template={{
          code: 'GENERIC_PROPERTY_DOC',
          name: t('verification.uploadGenericDoc', 'Upload {{category}} Document', {
            category: selectedCategory === 'ALL' ? t('verification.documents', 'Document') : getCategoryLabel(selectedCategory),
          }),
          description: t(
            'verification.step3PropSubtitle',
            'Attach PDF or high-resolution photos of title deeds and tax receipts'
          ),
          allowedFormats: ['pdf', 'png', 'jpg', 'jpeg'],
          maxSizeBytes: 15,
        }}
      />

      {/* Uploaded Property Documents */}
      <VerificationSectionCard
        title={t('verification.uploadedDocRepo', 'Property Document Repository')}
        subtitle={t('verification.showingFilesCount', 'Showing {{count}} files', {
          count: filteredDocs.length,
        })}
        icon={Folder}
      >
        {filteredDocs.length === 0 ? (
          <VerificationEmptyState
            icon={Folder}
            title={t('verification.noDocumentsUploaded', 'No Documents Uploaded')}
            description={t(
              'verification.noDocsInCategory',
              'No documents uploaded in this category yet.'
            )}
          />
        ) : (
          <div className="space-y-3">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="relative group">
                <DocumentPreviewCard document={doc} />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    className="text-[11px] py-1 px-2.5 bg-background shadow-sm"
                    onClick={() => trackEvent(VERIFICATION_EVENTS.PROPERTY_DOCUMENT, { action: 'replace', docId: doc.id })}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    {t('common.replace', 'Replace Deed')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </VerificationSectionCard>
    </div>
  );
}
