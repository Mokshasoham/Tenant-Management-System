import React from 'react';
import { File, Eye, Download } from 'lucide-react';
import { formatDate } from '../utils/dashboardHelpers';

export const DocumentsCard = ({ documents = [] }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Lease Documents</h4>

      <div className="space-y-4">
        {documents.map((doc) => (
          <div key={doc.id} className="flex justify-between items-center gap-4 p-4 bg-slate-50 dark:bg-slate-850/50 rounded-2xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <File size={20} />
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-bold text-slate-850 dark:text-slate-200 truncate">{doc.name}</span>
                <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                  Version: <strong className="font-semibold">{doc.version}</strong> | {formatDate(doc.uploadedAt)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => alert(`Previewing ${doc.name}...`)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition"
                title="Preview file"
                aria-label={`Preview ${doc.name}`}
              >
                <Eye size={16} />
              </button>
              <button
                onClick={() => alert(`Downloading ${doc.name}...`)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition"
                title="Download file"
                aria-label={`Download ${doc.name}`}
              >
                <Download size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentsCard;
