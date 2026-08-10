import React from 'react';
import { FileText, Download, Eye, ShieldCheck, CheckCircle2 } from 'lucide-react';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export function LeaseDocumentsCard({
  documents = [],
  lease,
  activeRenewal,
  onPreviewDocument,
  onDownloadDocument
}) {
  // Ensure default documents list includes current lease agreement & active renewal draft if available
  const docList = [...documents];

  if (!docList.some(d => d.category === 'lease') && lease) {
    docList.unshift({
      id: `doc-lease-${lease.id || lease._id}`,
      name: 'Current Lease Agreement.pdf',
      category: 'lease',
      uploadedAt: lease.startDate || new Date(),
      version: '1.0.0',
      status: 'VERIFIED'
    });
  }

  if (activeRenewal && !docList.some(d => d.category === 'renewal_agreement')) {
    docList.push({
      id: `doc-ren-${activeRenewal.id || activeRenewal._id}`,
      name: `Renewal_Agreement_${activeRenewal.renewalNumber || 'LRN'}.pdf`,
      category: 'renewal_agreement',
      uploadedAt: activeRenewal.createdAt || new Date(),
      version: `1.${activeRenewal.version || 0}.0`,
      status: activeRenewal.status === 'completed' ? 'EXECUTED' : 'DRAFT'
    });
  }

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">LEASE DOCUMENTS</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Contracts, drafts & compliance PDFs</p>
          </div>
        </div>

        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
          {docList.length} File{docList.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {docList.map((doc) => (
          <div key={doc.id} className="py-3 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 font-bold">
                PDF
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{doc.name}</p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>v{doc.version || '1.0'}</span>
                  <span>•</span>
                  <span>{formatDate(doc.uploadedAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onPreviewDocument && onPreviewDocument(doc)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                title="Preview Document"
              >
                <Eye className="w-4 h-4" />
              </button>

              <button
                onClick={() => onDownloadDocument && onDownloadDocument(doc)}
                className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 transition cursor-pointer"
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LeaseDocumentsCard;
