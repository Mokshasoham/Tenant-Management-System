import React, { useState } from 'react';
import { FileText, Folder, CheckCircle, Clock, XCircle, AlertTriangle, FileQuestion, RefreshCw } from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
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
  const { activeVerification } = useVerificationContext();
  const [selectedCategory, setSelectedCategory] = useState('ALL');

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

  const handleCategorySelect = (key) => {
    setSelectedCategory(key);
    trackEvent(VERIFICATION_EVENTS.PROPERTY_DOCUMENT, { category: key });
  };

  return (
    <div className="p-6 sm:p-10 space-y-8">
      <VerificationPageHeader
        title="Property Document Workspace"
        subtitle="Manage title deeds, property tax receipts, occupancy certificates, utility bills, and safety NOCs"
        icon={FileText}
        breadcrumbs={[
          { label: 'Property Operations', href: '/properties' },
          { label: 'Property Verification', href: '/property/verification' },
          { label: 'Documents' },
        ]}
      />

      {/* 5 KPI Summary Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground">Uploaded</p>
            <p className="text-base font-black text-foreground">{uploadedCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground">Pending</p>
            <p className="text-base font-black text-foreground">{pendingCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
            <XCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground">Rejected</p>
            <p className="text-base font-black text-foreground">{rejectedCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground">Expired</p>
            <p className="text-base font-black text-foreground">{expiredCount}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-border bg-card flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="p-2 rounded-xl bg-slate-500/10 text-slate-500">
            <FileQuestion className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground">Missing</p>
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
            {cat.label}
          </button>
        ))}
      </div>

      {/* Upload Zone */}
      <DocumentUploadCard
        template={{
          code: 'GENERIC_PROPERTY_DOC',
          name: `Upload ${selectedCategory === 'ALL' ? 'Property File' : selectedCategory}`,
          description: 'Upload high-resolution Sale Deed, Tax Receipt, or Building Plan PDF',
          allowedFormats: ['pdf', 'png', 'jpg', 'jpeg'],
          maxSizeBytes: 15,
        }}
      />

      {/* Uploaded Property Documents */}
      <VerificationSectionCard title="Property Document Repository" subtitle={`Showing ${filteredDocs.length} files`} icon={Folder}>
        {filteredDocs.length === 0 ? (
          <VerificationEmptyState
            icon={Folder}
            title="No Documents Uploaded"
            description={`No property files found in the ${selectedCategory} category yet.`}
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
                    Replace Deed
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
