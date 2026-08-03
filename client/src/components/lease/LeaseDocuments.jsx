import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, ExternalLink, Download, History, 
  ShieldCheck, FileCheck, FolderOpen, X 
} from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Lease Documents Center Component (V3.0.1)
 * Displays enterprise lease agreements, previous revisions, property rules, and receipts.
 */
export const LeaseDocuments = React.memo(({ lease }) => {
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Normalize document records from lease.documents or fallback pdfUrl
  const documentList = useMemo(() => {
    if (!lease) return [];

    const docs = [];
    
    // Check lease.documents array from Lease Document Engine
    if (lease.documents && Array.isArray(lease.documents) && lease.documents.length > 0) {
      lease.documents.forEach((doc, idx) => {
        const isLatest = idx === lease.documents.length - 1;
        docs.push({
          id: doc.fileId || `doc-${idx}`,
          name: doc.name || `Enterprise Lease Agreement (${lease.leaseNumber || 'v1.0'})`,
          type: 'Lease Agreement',
          version: `v${idx + 1}.0`,
          status: isLatest ? 'active' : 'superseded',
          uploadedAt: doc.uploadedAt || lease.createdAt || new Date(),
          size: doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : '35.6 KB',
          url: doc.url || `/api/files/download/${doc.fileId}`,
        });
      });
    } else if (lease.pdfUrl || lease.fileId) {
      docs.push({
        id: lease.fileId || 'main-lease-pdf',
        name: `Enterprise Lease Agreement (${lease.leaseNumber || 'Doc'})`,
        type: 'Lease Agreement',
        version: `v${lease.leaseVersion || 1}.0`,
        status: 'active',
        uploadedAt: lease.createdAt || new Date(),
        size: '35.6 KB',
        url: lease.pdfUrl || `/api/files/download/${lease.fileId}`,
      });
    }

    // Add standard property rules document item if available
    docs.push({
      id: 'prop-rules-standard',
      name: 'Property Rules & Community Guidelines',
      type: 'Policy Document',
      version: 'v1.0',
      status: 'active',
      uploadedAt: lease.createdAt || new Date(),
      size: '18.4 KB',
      url: '#',
      isSystemPolicy: true,
    });

    return docs;
  }, [lease]);

  const activeDoc = documentList.find(d => d.status === 'active') || documentList[0];

  const formatTargetUrl = (url, isDownload = false) => {
    if (!url || url === '#') return '#';

    const token = localStorage.getItem('token');
    let target = url;

    // Resolve base API URL if relative path
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const cleanBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
      target = `${cleanBase}${target.startsWith('/') ? '' : '/'}${target}`;
    }

    const separator = target.includes('?') ? '&' : '?';
    const params = [];

    if (token && !target.includes('token=')) {
      params.push(`token=${encodeURIComponent(token)}`);
    }

    if (isDownload && !target.includes('download=')) {
      params.push('download=true');
    }

    if (params.length > 0) {
      target = `${target}${separator}${params.join('&')}`;
    }

    return target;
  };

  const handlePreview = (url) => {
    if (!url || url === '#') {
      alert('This document is a system default guideline.');
      return;
    }
    const targetUrl = formatTargetUrl(url, false);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = (url, name) => {
    if (!url || url === '#') {
      alert('This document is a system default guideline.');
      return;
    }
    const targetUrl = formatTargetUrl(url, true);
    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = name || 'Lease_Document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!lease) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground uppercase tracking-wider">Lease Documents Center</p>
              <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mt-0.5">Enterprise Generated PDFs &amp; Version Vault</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {documentList.length > 1 && (
              <button
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
              >
                <History className="w-3.5 h-3.5" /> Version History ({documentList.length})
              </button>
            )}
          </div>
        </div>

        {/* Document Cards Grid */}
        {documentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground/50 border border-dashed border-border rounded-2xl">
            <FolderOpen className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm font-bold">No documents attached yet</p>
            <p className="text-xs text-muted-foreground/60">Documents generated by the Lease Engine will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documentList.map((doc) => {
              const isActive = doc.status === 'active';

              return (
                <div
                  key={doc.id}
                  className={cn(
                    "p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between group hover:shadow-md",
                    isActive ? "bg-card border-border hover:border-emerald-500/30" : "bg-muted/30 border-border/60 opacity-80"
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-3 rounded-2xl font-black text-xs flex items-center justify-center",
                        isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                      )}>
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {doc.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">{doc.type}</span>
                          <span className="text-[9px] text-muted-foreground/30">•</span>
                          <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">{doc.version}</span>
                        </div>
                      </div>
                    </div>

                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border",
                      isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"
                    )}>
                      {doc.status}
                    </span>
                  </div>

                  {/* Actions & Details Footer */}
                  <div className="pt-3 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground/60 font-medium">
                    <span>{new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {doc.size}</span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePreview(doc.url)}
                        className="p-1.5 rounded-lg bg-muted hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-colors flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider"
                        title="Preview Document"
                      >
                        <ExternalLink className="w-3 h-3" /> Preview
                      </button>
                      <button
                        onClick={() => handleDownload(doc.url, doc.name)}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider"
                        title="Download Document"
                      >
                        <Download className="w-3 h-3" /> Download
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Version History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-card border border-border p-6 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Document Version Vault</h3>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1.5 rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {documentList.map((doc) => (
                  <div key={doc.id} className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-foreground">{doc.name}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-medium">
                        Version: {doc.version} • {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handlePreview(doc.url)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> View
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
});

LeaseDocuments.displayName = 'LeaseDocuments';
export default LeaseDocuments;
