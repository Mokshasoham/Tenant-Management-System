import React, { useState } from 'react';
import Modal from '../../Modal';
import { Button, Input } from '../../PremiumUI';
import { CheckCircle2 } from 'lucide-react';

export const ApprovalDialog = ({ isOpen, onClose, onConfirm, loading = false }) => {
  const [remarks, setRemarks] = useState('');

  const handleConfirm = () => {
    onConfirm(remarks);
    setRemarks('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Approve Verification"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Approving...' : 'Confirm Approval'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-xs font-semibold">
            Approving this verification will award trust score points and update platform verification badges.
          </p>
        </div>
        <Input
          label="Approval Remarks (Optional)"
          placeholder="e.g. All documents verified clean."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>
    </Modal>
  );
};

export default ApprovalDialog;
