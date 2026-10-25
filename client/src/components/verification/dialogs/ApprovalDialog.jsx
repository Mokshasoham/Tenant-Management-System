import React, { useState } from 'react';
import Modal from '../../Modal';
import { Button, Input } from '../../PremiumUI';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export const ApprovalDialog = ({ isOpen, onClose, onConfirm, loading = false }) => {
  const { t } = useLanguage();
  const [remarks, setRemarks] = useState('');

  const handleConfirm = () => {
    onConfirm(remarks);
    setRemarks('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('verification.approveVerification', 'Approve Verification')}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={loading}>
            {loading
              ? t('verification.approving', 'Approving...')
              : t('verification.confirmApproval', 'Confirm Approval')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-xs font-semibold">
            {t(
              'verification.approvalNotice',
              'Approving this verification will award trust score points and update platform verification badges.'
            )}
          </p>
        </div>
        <Input
          label={t('verification.approvalRemarksLabel', 'Approval Remarks (Optional)')}
          placeholder={t('verification.approvalRemarksPlaceholder', 'e.g. All documents verified clean.')}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>
    </Modal>
  );
};

export default ApprovalDialog;
