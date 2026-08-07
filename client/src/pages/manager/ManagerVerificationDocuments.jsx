import React, { useState } from 'react';
import { FileText, Upload, Folder, ShieldCheck } from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  DocumentUploadCard,
  DocumentPreviewCard,
  UploadRequirementsCard,
} from '../../components/verification';

export default function ManagerVerificationDocuments() {
  const { activeVerification } = useVerificationContext();
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categories = [
    { key: 'ALL', label: 'All Documents' },
    { key: 'IDENTITY', label: 'Manager Identity' },
    { key: 'BUSINESS', label: 'Business Registration' },
    { key: 'TAX', label: 'Tax / GST Clearances' },
    { key: 'PROPERTY', label: 'Property Ownership' },
  ];

  const docs = activeVerification?.documents || [
    { _id: 'd1', type: 'GOVT_ID', filename: 'passport.pdf', status: 'VERIFIED', category: 'IDENTITY' },
    { _id: 'd2', type: 'BUSINESS_REGISTRATION', filename: 'company_license.pdf', status: 'VERIFIED', category: 'BUSINESS' },
  ];

  const filteredDocs =
    selectedCategory === 'ALL' ? docs : docs.filter((d) => (d.category || 'IDENTITY') === selectedCategory);

  return (
    <div className="p-6 sm:p-10 space-y-8">
      <VerificationPageHeader
        title="Manager Document Workspace"
        subtitle="Categorized manager identity, business registration, and property tax clearance document management"
        icon={FileText}
        breadcrumbs={[
          { label: 'Manager Portal', href: '/dashboard' },
          { label: 'Verification Home', href: '/manager/verification' },
          { label: 'Documents' },
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
          name: `Upload ${selectedCategory} Document`,
          description: 'Upload official business or identity document file',
          allowedFormats: ['pdf', 'png', 'jpg', 'docx'],
          maxSizeBytes: 10,
        }}
      />

      {/* Uploaded Documents List */}
      <VerificationSectionCard title="Uploaded Document Repository" subtitle={`Showing ${filteredDocs.length} files`} icon={Folder}>
        {filteredDocs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No documents uploaded in this category yet.</p>
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
