import React, { useState } from 'react';
import { CheckCircle, XCircle, UserPlus, Archive, AlertTriangle, ShieldCheck, Lock, Send } from 'lucide-react';
import { VerificationSectionCard } from '../../../../components/verification';

export default function PropertyAdminActions({ property, onActionConfirm }) {
  const [modalAction, setModalAction] = useState(null); // 'APPROVE' | 'REJECT' | 'SUSPEND' | 'ARCHIVE' | 'DELETE'
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      alert('Action justification reason is required for compliance logging.');
      return;
    }
    if (onActionConfirm) {
      onActionConfirm(modalAction, reason);
    }
    setModalAction(null);
    setReason('');
  };

  return (
    <VerificationSectionCard title="Enterprise High-Risk Admin Actions & Approvals" icon={ShieldCheck}>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setModalAction('APPROVE')}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
        >
          <CheckCircle className="w-4 h-4" /> Approve Verification
        </button>

        <button
          onClick={() => setModalAction('REJECT')}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
        >
          <XCircle className="w-4 h-4" /> Reject Verification
        </button>

        <button
          onClick={() => setModalAction('SUSPEND')}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
        >
          <AlertTriangle className="w-4 h-4" /> Suspend Property
        </button>

        <button
          onClick={() => setModalAction('ARCHIVE')}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
        >
          <Archive className="w-4 h-4" /> Archive Record
        </button>

        <button
          onClick={() => alert('Assigned reviewer Alex Mercer')}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" /> Assign Reviewer
        </button>
      </div>

      {/* Confirmation Modal */}
      {modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Confirm Admin Operation: {modalAction}</h3>
            </div>
            <p className="text-xs text-slate-300">
              Executing <strong className="text-white">{modalAction}</strong> on property <span className="font-mono text-indigo-400">{property?.propertyId}</span> will be recorded in the compliance audit log.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Reason / Audit Justification (Required):</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter regulatory or compliance reason for audit trail..."
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModalAction(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg"
              >
                Confirm & Log Action
              </button>
            </div>
          </div>
        </div>
      )}
    </VerificationSectionCard>
  );
}
