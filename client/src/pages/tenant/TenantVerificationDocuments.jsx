import React, { useState } from 'react';
import { FileText, Folder, CheckCircle, Clock, XCircle, AlertTriangle, FileQuestion, RefreshCw } from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
import { trackEvent, VERIFICATION_EVENTS } from '../../utils/verificationAnalytics';
import { mapDocuments } from '../../mappers/tenantVerificationMapper';
import { MOCK_DOCUMENT_CATEGORIES, MOCK_REQUIRED_DOC_TYPES } from '../../mocks/tenantVerificationMock';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  DocumentUploadCard,
  DocumentPreviewCard,
  VerificationEmptyState,
} from '../../components/verification';
import { Button } from '../../components/PremiumUI';

export default function TenantVerificationDocuments() {
  const { activeVerification } = useVerificationContext();
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const documents = mapDocuments(activeVerification?.documents);

  const filteredDocs =
    selectedCategory === 'ALL'
      ? documents
      : documents.filter((d) => (d.category || 'IDENTITY') === selectedCategory);

  // Enhancement #4: Document Status KPI Cards calculation
  const uploadedCount = documents.filter((d) => d.status === 'VERIFIED' || d.status === 'UPLOADED').length;
  const pendingCount = documents.filter((d) => d.status === 'PENDING' || d.status === 'DRAFT').length;
  const rejectedCount = documents.filter((d) => d.status === 'REJECTED').length;
  const expiredCount = documents.filter((d) => d.status === 'EXPIRED').length;
  const requiredTypesCount = MOCK_REQUIRED_DOC_TYPES.length;
  const missingCount = Math.max(0, requiredTypesCount - uploadedCount);

  const handleCategorySelect = (key) => {
    setSelectedCategory(key);
    trackEvent(VERIFICATION_EVENTS.CATEGORY_CHANGED, { category: key });
  };

  return (
    <div className="p-6 sm:p-10 space-y-8">
      <VerificationPageHeader
        title="Tenant Document Workspace"
        subtitle="Manage identity proofs, address documents, employment letters, and financial records"
        icon={FileText}
        breadcrumbs={[
          { label: 'Tenant Portal', href: '/dashboard' },
          { label: 'Verification Home', href: '/tenant/verification' },
          { label: 'Documents' },
        ]}
      />

      {/* Enhancement #4: Document Status KPI Summary Cards */}
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

      {/* Category Filter Tabs */}
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
          code: 'GENERIC_TENANT_DOC',
          name: `Upload ${selectedCategory === 'ALL' ? 'Document' : selectedCategory} File`,
          description: 'Upload high-resolution PDF or image file (max 10MB)',
          allowedFormats: ['pdf', 'png', 'jpg', 'jpeg'],
          maxSizeBytes: 10,
        }}
      />

      {/* Uploaded Documents List with Enhancement #18 & #7 */}
      <VerificationSectionCard title="Document Repository" subtitle={`Showing ${filteredDocs.length} files`} icon={Folder}>
        {/* Enhancement #7: Contextual Empty State */}
        {filteredDocs.length === 0 ? (
          <VerificationEmptyState
            icon={Folder}
            title="No Documents Uploaded"
            description={`No files found in the ${selectedCategory} category yet. Upload your first document to build rental trust.`}
          />
        ) : (
          <div className="space-y-3">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="relative group">
                <DocumentPreviewCard document={doc} />
                {/* Enhancement #18: Replace Action Button overlay */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    className="text-[11px] py-1 px-2.5 bg-background shadow-sm"
                    onClick={() => trackEvent(VERIFICATION_EVENTS.DOCUMENT_REPLACED, { docId: doc.id })}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Replace File
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
