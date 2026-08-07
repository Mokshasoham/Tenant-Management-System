import React from 'react';
import { X, History } from 'lucide-react';
import VerificationStatusBadge from '../badges/VerificationStatusBadge';

export const VerificationHistoryDrawer = ({ isOpen, onClose, history = [] }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card border-l border-border p-6 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h2 className="text-base font-black text-foreground">Submission History</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No historical versions found.</p>
        ) : (
          <div className="space-y-4">
            {history.map((ver, idx) => (
              <div key={ver._id || idx} className="p-4 rounded-xl border border-border bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Version {ver.submissionVersion || 1}</span>
                  <VerificationStatusBadge status={ver.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Submitted: {ver.createdAt ? new Date(ver.createdAt).toLocaleDateString() : 'N/A'}
                </p>
                {ver.verificationRemarks && (
                  <p className="text-xs text-foreground italic bg-card p-2 rounded-lg border border-border">
                    "{ver.verificationRemarks}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default VerificationHistoryDrawer;
