import React, { useState, memo } from 'react';
import { Shield, Upload, FileText, Check, AlertTriangle } from 'lucide-react';
import SettingsCard from './primitives/SettingsCard';
import StatusBadge from './primitives/StatusBadge';
import ActionButton from './primitives/ActionButton';
import useAuthStore from '../../context/authStore';
import { userService } from '../../services/api';
import { openSecureFile } from '../../utils/fileAccess';

export const KYCCard = memo(({ disabled = false }) => {
  const { user, setUser } = useAuthStore();
  const [kycFiles, setKycFiles] = useState([]);
  const [kycStatusMsg, setKycStatusMsg] = useState('');
  const [kycStatusType, setKycStatusType] = useState(null);

  const handleKycFileChange = (e) => {
    setKycFiles(Array.from(e.target.files));
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    if (kycFiles.length === 0) return;

    setKycStatusType('saving');
    setKycStatusMsg('');

    const formData = new FormData();
    kycFiles.forEach(file => {
      formData.append('documents', file);
    });

    try {
      const res = await userService.uploadKycDocuments(formData);
      if (setUser) {
        setUser({
          ...user,
          kycStatus: res.data.kycStatus,
          kycDocuments: res.data.kycDocuments
        });
      }
      setKycStatusType('success');
      setKycStatusMsg('KYC Documents uploaded successfully. Pending verification.');
      setKycFiles([]);
    } catch (err) {
      setKycStatusType('error');
      setKycStatusMsg(err.response?.data?.message || err.message || 'Failed to upload documents');
    }
  };

  const kycVariant = user?.kycStatus === 'verified' || user?.kycStatus === 'approved' ? 'success'
    : user?.kycStatus === 'pending' ? 'warning' : 'neutral';

  return (
    <SettingsCard
      title="Identity Verification (KYC)"
      subtitle="Official identity document upload & verification status"
      icon={Shield}
      iconColor="text-indigo-500"
      badge={<StatusBadge label={user?.kycStatus || 'Unverified'} variant={kycVariant} />}
    >
      <div className="space-y-4">
        {(user?.kycStatus === 'unverified' || user?.kycStatus === 'rejected' || !user?.kycStatus) && (
          <form onSubmit={handleKycSubmit} className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground font-medium">Please upload valid identity documents (Passport, Driver's License, National ID) to verify your account.</p>

            <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center bg-muted/30 hover:border-primary/50 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground mb-3" />
              <label className="cursor-pointer text-sm font-bold text-primary hover:underline">
                Browse Files
                <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleKycFileChange} disabled={disabled} />
              </label>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG or PDF, max 5MB per file.</p>
            </div>

            {kycFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selected Documents ({kycFiles.length})</p>
                {kycFiles.map((f, i) => (
                  <div key={i} className="flex items-center text-sm px-3 py-2 bg-muted rounded-lg border border-border">
                    <FileText className="w-4 h-4 mr-2 text-primary" />
                    <span className="truncate flex-1 font-semibold">{f.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ))}
              </div>
            )}

            <ActionButton
              type="submit"
              loading={kycStatusType === 'saving'}
              disabled={disabled || kycFiles.length === 0}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
            >
              Submit KYC Documents
            </ActionButton>
          </form>
        )}

        {kycStatusType && (
          <div className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${
            kycStatusType === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
            'bg-rose-500/10 border-rose-500/20 text-rose-500'
          }`}>
            {kycStatusType === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{kycStatusMsg}</span>
          </div>
        )}

        {user?.kycDocuments?.length > 0 && (
          <div className="pt-4 border-t border-border space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Uploaded Documents</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {user.kycDocuments.map((doc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => openSecureFile(doc)}
                  className="flex items-center text-sm p-3 bg-muted rounded-xl border border-border hover:border-primary transition-colors hover:text-primary text-left w-full font-semibold"
                >
                  <FileText className="w-4 h-4 mr-2 text-primary" /> Verification Document {idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </SettingsCard>
  );
});

KYCCard.displayName = 'KYCCard';
export default KYCCard;
