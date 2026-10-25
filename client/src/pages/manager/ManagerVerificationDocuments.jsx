import React, { useState, useMemo } from 'react';
import { FileText, Upload, Folder, ShieldCheck } from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  DocumentUploadCard,
  DocumentPreviewCard,
  UploadRequirementsCard,
} from '../../components/verification';

export default function ManagerVerificationDocuments() {
  const { t } = useLanguage();
  const { activeVerification } = useVerificationContext();
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categories = useMemo(
    () => [
      { key: 'ALL', label: t('verification.allDocuments', 'All Documents') },
      { key: 'IDENTITY', label: t('verification.managerIdentity', 'Manager Identity') },
      { key: 'BUSINESS', label: t('verification.businessRegistration', 'Business Registration') },
      { key: 'TAX', label: t('verification.taxGstClearances', 'Tax / GST Clearances') },
      { key: 'PROPERTY', label: t('verification.propertyOwnership', 'Property Ownership') },
    ],
    [t]
  );

  const docs = activeVerification?.documents || [
    { _id: 'd1', type: 'GOVT_ID', filename: 'passport.pdf', status: 'VERIFIED', category: 'IDENTITY' },
    { _id: 'd2', type: 'BUSINESS_REGISTRATION', filename: 'company_license.pdf', status: 'VERIFIED', category: 'BUSINESS' },
  ];

  const filteredDocs =
    selectedCategory === 'ALL' ? docs : docs.filter((d) => (d.category || 'IDENTITY') === selectedCategory);

  const activeCategoryLabel = categories.find((c) => c.key === selectedCategory)?.label || selectedCategory;

  return (
    <div className="p-6 sm:p-10 space-y-8">
      <VerificationPageHeader
        title={t('verification.docWorkspaceTitle', 'Manager Document Workspace')}
        subtitle={t(
          'verification.docWorkspaceSubtitle',
          'Categorized manager identity, business registration, and property tax clearance document management'
        )}
        icon={FileText}
        breadcrumbs={[
          { label: t('nav.managerPortal', 'Manager Portal'), href: '/dashboard' },
          { label: t('verification.verificationHome', 'Verification Home'), href: '/manager/verification' },
          { label: t('verification.documents', 'Documents') },
        ]}
      />

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
        {categories.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === cat.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Upload Zone */}
      <DocumentUploadCard
        template={{
          code: 'GENERIC_DOC',
          name: t('verification.uploadGenericDoc', 'Upload {{category}} Document', {
            category: activeCategoryLabel,
          }),
          description: t(
            'verification.uploadDocDesc',
            'Upload official business or identity document file'
          ),
          allowedFormats: ['pdf', 'png', 'jpg', 'docx'],
          maxSizeBytes: 10,
        }}
      />

      {/* Uploaded Documents List */}
      <VerificationSectionCard
        title={t('verification.uploadedDocRepo', 'Uploaded Document Repository')}
        subtitle={t('verification.showingFilesCount', 'Showing {{count}} files', {
          count: filteredDocs.length,
        })}
        icon={Folder}
      >
        {filteredDocs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            {t('verification.noDocsInCategory', 'No documents uploaded in this category yet.')}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredDocs.map((doc) => (
              <DocumentPreviewCard key={doc._id} document={doc} />
            ))}
          </div>
        )}
      </VerificationSectionCard>
    </div>
  );
}
