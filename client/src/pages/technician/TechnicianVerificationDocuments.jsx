import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Download,
  Filter,
  Eye,
} from 'lucide-react';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  VerificationStatusBadge,
  VerificationEmptyState,
} from '../../components/verification';
import { useLanguage } from '../../context/LanguageContext';

import getVerificationMapper from '../../mappers/verificationMapperFactory';
import { MOCK_DOCUMENT_CATEGORIES } from '../../mocks/technicianVerificationMock';
import trackEvent, { VERIFICATION_EVENTS } from '../../utils/verificationAnalytics';

export default function TechnicianVerificationDocuments() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const mapper = getVerificationMapper('TECHNICIAN');

  const [documents, setDocuments] = useState([]);
  const [activeCategory, setActiveCategory] = useState('ALL');

  useEffect(() => {
    const docs = mapper.mapDocuments(null);
    setDocuments(docs);
  }, []);

  const handleReplace = (docId) => {
    trackEvent(VERIFICATION_EVENTS.TECHNICIAN_DOCUMENT, { action: 'replace', docId });
    alert(`Replace document #${docId} clicked. Select new file.`);
  };

  const filteredDocs =
    activeCategory === 'ALL'
      ? documents
      : documents.filter((d) => d.category === activeCategory);

  const kpis = {
    uploaded: documents.length,
    pending: documents.filter((d) => d.status === 'PENDING').length,
    rejected: documents.filter((d) => d.status === 'REJECTED').length,
    expired: documents.filter((d) => d.status === 'EXPIRED').length,
    missing: 1,
  };

  return (
    <div className="p-6 sm:p-10 space-y-8">
      {/* Page Header */}
      <VerificationPageHeader
        title={t('technicianDocs.title', 'Technician Trade Documents & Diplomas')}
        subtitle={t('technicianDocs.subtitle', 'Manage master trade licenses, ITI certifications, liability insurance, and portfolio photos')}
        icon={FileCheck}
        actionText={t('technicianDocs.uploadNew', 'Upload New Document')}
        onAction={() => navigate('/technician/verification/wizard')}
      />

      {/* Top 5 KPI Summary Counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 font-medium uppercase">{t('technicianDocs.uploaded', 'Uploaded')}</p>
          <p className="text-xl font-extrabold text-indigo-400 mt-1">{kpis.uploaded}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 font-medium uppercase">{t('technicianDocs.pendingAudit', 'Pending Audit')}</p>
          <p className="text-xl font-extrabold text-amber-400 mt-1">{kpis.pending}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 font-medium uppercase">{t('technicianDocs.rejected', 'Rejected')}</p>
          <p className="text-xl font-extrabold text-rose-400 mt-1">{kpis.rejected}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 font-medium uppercase">{t('technicianDocs.expired', 'Expired')}</p>
          <p className="text-xl font-extrabold text-slate-400 mt-1">{kpis.expired}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 font-medium uppercase">{t('technicianDocs.missing', 'Missing')}</p>
          <p className="text-xl font-extrabold text-indigo-300 mt-1">{kpis.missing}</p>
        </div>
      </div>

      {/* 8 Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {MOCK_DOCUMENT_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeCategory === cat.key
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Document Grid */}
      {filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <VerificationStatusBadge status={doc.status} />
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-100 truncate">{doc.filename}</h4>
                  <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                    {doc.category}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800/80">
                  <p>{t('technicianDocs.uploadedDate', 'Uploaded')}: {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                  {doc.expiresAt && <p>{t('technicianDocs.expiresDate', 'Expires')}: {new Date(doc.expiresAt).toLocaleDateString()}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => alert(`Preview ${doc.filename}`)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all flex items-center cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> {t('common.view', 'View')}
                </button>
                <button
                  onClick={() => handleReplace(doc.id)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all flex items-center cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> {t('technicianDocs.replaceFile', 'Replace File')}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <VerificationEmptyState
          title={t('technicianDocs.noDocsFound', 'No Trade Documents Found')}
          message={t('technicianDocs.noDocsCategory', 'No trade documents under category {{category}}.', { category: activeCategory })}
          actionText={t('technicianDocs.uploadDoc', 'Upload Document')}
          onAction={() => navigate('/technician/verification/wizard')}
        />
      )}
    </div>
  );
}
