import React from 'react';
import { FileText, Eye, Download, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { VerificationSectionCard } from '../../../../components/verification';
import { MOCK_GROUPED_DOCUMENTS } from '../../../../mocks/adminPropertyMock';

export default function PropertyDocumentsTab({ property }) {
  return (
    <div className="space-y-6">
      {Object.entries(MOCK_GROUPED_DOCUMENTS).map(([category, docs]) => (
        <VerificationSectionCard key={category} title={`${category} Documents Workspace`} icon={FileText}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docs.map((doc) => (
              <div key={doc.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{doc.title}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{doc.filename} · {doc.version}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {doc.status}
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                  <p>Uploaded By: <strong className="text-slate-200">{doc.uploadedBy}</strong> ({doc.uploadedDate})</p>
                  <p>Verified By: <strong className="text-indigo-400">{doc.verifiedBy}</strong></p>
                  <p>Expiry Date: <strong className="text-amber-400">{doc.expiry}</strong></p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <button onClick={() => alert(`Previewing ${doc.filename}`)} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                  <button onClick={() => alert(`Downloading ${doc.filename}`)} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400 font-semibold text-xs flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </VerificationSectionCard>
      ))}
    </div>
  );
}
