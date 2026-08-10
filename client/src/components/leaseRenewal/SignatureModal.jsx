import React, { useState } from 'react';
import { X, FileSignature, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export function SignatureModal({ isOpen, onClose, activeRenewal, onSignAgreement }) {
  const [signatureText, setSignatureText] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !activeRenewal) return null;

  const handleSign = async (e) => {
    e.preventDefault();
    if (!signatureText.trim()) {
      setError('Please type your legal full name as digital signature.');
      return;
    }
    if (!agreeTerms) {
      setError('You must confirm acceptance of the lease renewal terms.');
      return;
    }

    setSigning(true);
    setError(null);

    try {
      const signatureData = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="50"><text x="10" y="35" font-family="cursive" font-size="24">${encodeURIComponent(
        signatureText
      )}</text></svg>`;

      await onSignAgreement(signatureData);
      onClose();
    } catch (err) {
      console.error('Error signing agreement:', err);
      setError(err.message || 'Failed to submit signature. Please try again.');
    } finally {
      setSigning(false);
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
            <FileSignature className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Sign Lease Renewal Agreement
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Reference Contract #: {activeRenewal.renewalNumber || 'LRN'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSign} className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Digital Signature Input
            </span>
            <input
              type="text"
              value={signatureText}
              onChange={(e) => setSignatureText(e.target.value)}
              placeholder="Type your full legal name..."
              className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold text-sm focus:outline-none focus:border-emerald-500"
            />
            {signatureText && (
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-center font-serif text-lg text-emerald-700 dark:text-emerald-400 italic">
                {signatureText}
              </div>
            )}
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer text-slate-600 dark:text-slate-400 text-xs select-none">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700"
            />
            <span>
              I confirm that I have reviewed the renewal terms and accept this digital signature as legally binding under the Electronic Signatures Act.
            </span>
          </label>

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
              disabled={signing || !signatureText.trim() || !agreeTerms}
              className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
            >
              {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{signing ? 'Signing...' : 'Sign Agreement'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SignatureModal;
