import React from 'react';
import { CheckCircle, XCircle, UserPlus, Archive, AlertTriangle, ShieldCheck } from 'lucide-react';
import { VerificationSectionCard } from '../../../../components/verification';
import { cn } from '../../../../utils/cn';

export default function PropertyAdminActions({ onExecute, theme }) {
  return (
    <VerificationSectionCard title="Enterprise High-Risk Admin Actions & Approvals" icon={ShieldCheck}>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => onExecute('APPROVE', 'Approve Property Verification')}
          className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xl transition-all flex items-center gap-2 cursor-pointer hover:scale-105"
        >
          <CheckCircle className="w-4 h-4" /> Approve Verification
        </button>

        <button
          onClick={() => onExecute('REJECT', 'Reject Verification Request')}
          className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-xl transition-all flex items-center gap-2 cursor-pointer hover:scale-105"
        >
          <XCircle className="w-4 h-4" /> Reject Verification
        </button>

        <button
          onClick={() => onExecute('SUSPEND', 'Suspend Property Listing')}
          className="px-5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-xl transition-all flex items-center gap-2 cursor-pointer hover:scale-105"
        >
          <AlertTriangle className="w-4 h-4" /> Suspend Property
        </button>

        <button
          onClick={() => onExecute('ARCHIVE', 'Archive Property Record')}
          className={cn(
            "px-5 py-2.5 rounded-full font-extrabold text-xs shadow-xl transition-all flex items-center gap-2 cursor-pointer hover:scale-105 border",
            theme === 'light' ? "bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300" : "bg-slate-800 text-slate-200 border-white/10 hover:bg-slate-700"
          )}
        >
          <Archive className="w-4 h-4" /> Archive Record
        </button>

        <button
          onClick={() => onExecute('ASSIGN', 'Assign Compliance Lead')}
          className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-xl transition-all flex items-center gap-2 cursor-pointer hover:scale-105"
        >
          <UserPlus className="w-4 h-4" /> Assign Compliance Lead
        </button>
      </div>
    </VerificationSectionCard>
  );
}
