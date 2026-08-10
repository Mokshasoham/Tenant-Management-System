import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { userService } from '../../services/api';

export function KycUploadModal({ isOpen, onClose, onSuccess }) {
  const [docType, setDocType] = useState('Passport');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please choose a document file to upload.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('documents', selectedFile);
      formData.append('documentType', docType);

      await userService.uploadKycDocuments(formData);

      setSuccessMsg('KYC document uploaded successfully! Pending manager verification.');
      setSelectedFile(null);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('KYC Upload failed:', err);
      setError(err.response?.data?.message || 'Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative space-y-5 animate-scale-up">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Upload KYC Verification File
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Submit required identity documents for profile verification
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
              Document Category
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="Passport">Passport / International ID</option>
              <option value="National ID">National ID Card / Drivers License</option>
              <option value="Tax Document">Tax Document / SSN Card</option>
              <option value="Employment Verification">Employment Proof / Paystub</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
              Select Document File (PDF, JPG, PNG)
            </label>
            <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-center space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-400" />
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
                id="kyc-file-input"
              />
              <label
                htmlFor="kyc-file-input"
                className="inline-block px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer transition"
              >
                {selectedFile ? selectedFile.name : 'Choose File'}
              </label>
              {selectedFile && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold truncate">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{uploading ? 'Uploading...' : 'Upload Document'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default KycUploadModal;
