import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, ExternalLink, Download, FileCheck, FolderOpen } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Lease Documents Center Component (Simplified V3.0.2)
 * Displays the single official Signed Lease Agreement for tenants.
 */
export const LeaseDocuments = React.memo(({ lease }) => {
  // Extract the single official active lease agreement (displaying v1.0)
  const officialLeaseDoc = useMemo(() => {
    if (!lease) return null;

    let latestDoc = null;
    if (lease.documents && Array.isArray(lease.documents) && lease.documents.length > 0) {
      latestDoc = lease.documents[lease.documents.length - 1];
    }

    const fileId = latestDoc?.fileId || lease.fileId;
    const uploadedAt = latestDoc?.uploadedAt || lease.createdAt || new Date();

    return {
      id: fileId || 'signed-lease-agreement',
      fileId,
      name: 'Signed Lease Agreement',
      type: 'Lease Agreement',
      version: 'v1.0',
      status: 'Active',
      uploadedAt,
      size: latestDoc?.size ? `${(latestDoc.size / 1024).toFixed(1)} KB` : '35.6 KB',
      url: fileId ? `/api/files/download/${fileId}` : (latestDoc?.url || lease.pdfUrl || '#'),
    };
  }, [lease]);

  const fetchSignedUrl = async (fileId, isDownload = false) => {
    if (!fileId || typeof fileId !== 'string' || !/^[a-f\d]{24}$/i.test(fileId)) {
      alert('Legacy lease document detected. Please regenerate the lease agreement.');
      return null;
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const cleanApiBase = apiBase.endsWith('/api') ? apiBase : `${apiBase.replace(/\/$/, '')}/api`;
    const serverOrigin = import.meta.env.VITE_API_URL || cleanApiBase.replace(/\/api$/, '') || 'http://localhost:5000';

    try {
      const res = await fetch(`${cleanApiBase}/files/signed-url/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 403) {
          alert('Access Denied: You do not have permission to access this document.');
        } else if (res.status === 404) {
          alert('Document file record not found. Please regenerate the lease agreement.');
        } else {
          alert('Failed to generate document access token.');
        }
        return null;
      }

      const data = await res.json();
      if (data.success && data.url) {
        let signedUrl = data.url.startsWith('http')
          ? data.url
          : `${serverOrigin.replace(/\/$/, '')}${data.url.startsWith('/') ? '' : '/'}${data.url}`;

        if (isDownload && !signedUrl.includes('download=')) {
          signedUrl += signedUrl.includes('?') ? '&download=true' : '?download=true';
        }
        return signedUrl;
      }
    } catch (err) {
      console.error('[LeaseDocuments] Failed to fetch signed URL:', err);
      alert('Network error while requesting document access token.');
    }

    return null;
  };

  const handlePreview = async () => {
    if (!officialLeaseDoc?.fileId) {
      alert('Legacy lease document detected. Please regenerate the lease agreement.');
      return;
    }
    const signedUrl = await fetchSignedUrl(officialLeaseDoc.fileId, false);
    if (signedUrl) {
      console.log('[LeaseDocuments DEBUG] Opening signed URL:', signedUrl);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownload = async () => {
    if (!officialLeaseDoc?.fileId) {
      alert('Legacy lease document detected. Please regenerate the lease agreement.');
      return;
    }
    const signedUrl = await fetchSignedUrl(officialLeaseDoc.fileId, true);
    if (signedUrl) {
      console.log('[LeaseDocuments DEBUG] Initiating download signed URL:', signedUrl);
      const a = document.createElement('a');
      a.href = signedUrl;
      a.download = 'Signed_Lease_Agreement.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (!lease) return null;

  return (
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
            <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest mt-0.5">Verified Enterprise Agreement</p>
          </div>
        </div>
      </div>

      {/* Official Lease Document Card */}
      {!officialLeaseDoc ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground/50 border border-dashed border-border rounded-2xl">
          <FolderOpen className="w-10 h-10 mb-2 opacity-50" />
          <p className="text-sm font-bold">No documents attached yet</p>
          <p className="text-xs text-muted-foreground/60">Documents generated by the Lease Engine will appear here automatically.</p>
        </div>
      ) : (
        <div className="p-5 rounded-2xl border transition-all duration-300 bg-card border-border hover:border-emerald-500/30 shadow-sm flex flex-col justify-between group">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-black text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {officialLeaseDoc.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">{officialLeaseDoc.type}</span>
                  <span className="text-[9px] text-muted-foreground/30">•</span>
                  <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">{officialLeaseDoc.version}</span>
                </div>
              </div>
            </div>

            <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              {officialLeaseDoc.status}
            </span>
          </div>

          {/* Actions & Details Footer */}
          <div className="pt-4 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground/60 font-medium">
            <span>
              Generated: {new Date(officialLeaseDoc.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {officialLeaseDoc.size}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePreview}
                className="px-3 py-1.5 rounded-xl bg-muted hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-colors flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wider border border-border/50"
                title="Preview Document"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Preview
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wider border border-emerald-500/20"
                title="Download Document"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
});

LeaseDocuments.displayName = 'LeaseDocuments';
export default LeaseDocuments;
