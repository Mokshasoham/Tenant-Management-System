import React from 'react';
import { FileText, Download, Eye, Share2, Printer } from 'lucide-react';
import { VerificationSectionCard } from '../../../../components/verification';
import { MOCK_PROPERTY_REPORTS } from '../../../../mocks/adminPropertyMock';

export default function PropertyReportsTab({ property }) {
  return (
    <VerificationSectionCard title="Enterprise Compliance Reports Generator" icon={FileText}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {MOCK_PROPERTY_REPORTS.map((rep) => (
          <div key={rep.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-slate-100">{rep.title}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Last Generated: {rep.lastGenerated}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {rep.type}
              </span>
            </div>

            <div className="flex items-center gap-2 border-t border-slate-800 pt-3">
              <button onClick={() => alert(`Previewing ${rep.title}`)} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
              <button onClick={() => alert(`Downloading PDF ${rep.title}`)} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> Download
              </button>
              <button onClick={() => alert(`Sharing Link for ${rep.title}`)} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400 font-semibold flex items-center gap-1">
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
            </div>
          </div>
        ))}
      </div>
    </VerificationSectionCard>
  );
}
