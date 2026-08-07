import React, { useState } from 'react';
import Modal from '../../Modal';
import { Button, Input } from '../../PremiumUI';
import { AlertTriangle } from 'lucide-react';

export const RejectDialog = ({ isOpen, onClose, onConfirm, loading = false }) => {
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState(null);

  const handleConfirm = () => {
    if (!remarks.trim()) {
      setError('Rejection remarks are required');
      return;
    }
    setError(null);
    onConfirm(remarks);
    setRemarks('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reject Verification"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleConfirm}
            disabled={loading}
            className="bg-rose-500 text-white hover:bg-rose-600"
          >
            {loading ? 'Rejecting...' : 'Confirm Rejection'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-xs font-semibold">
            Rejecting this verification will notify the submitter to resubmit corrected documents.
          </p>
        </div>
        <Input
          label="Rejection Reason / Remarks (Required)"
          placeholder="e.g. Govt ID image is blurry or expired."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          error={error}
        />
      </div>
    </Modal>
  );
};

export default RejectDialog;
