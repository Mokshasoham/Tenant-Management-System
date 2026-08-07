import React, { useState } from 'react';
import { Users, ChevronDown, ChevronUp, UserCheck } from 'lucide-react';

export default function ReviewerWorkloadBar({ reviewers = [], onSelectReviewer }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!reviewers || reviewers.length === 0) return null;

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <Users className="w-4 h-4 text-emerald-400" />
          <span>Compliance Reviewer Active Workload KPI</span>
        </div>
        <button className="text-slate-400 hover:text-slate-200">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {reviewers.map((rev) => (
            <div
              key={rev.id}
              onClick={() => onSelectReviewer && onSelectReviewer(rev.name)}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-emerald-500/40 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-xs flex items-center justify-center border border-emerald-500/30">
                  {rev.avatar}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">{rev.name}</p>
                  <p className="text-[10px] text-slate-400">{rev.role}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-emerald-400">{rev.pendingCount}</p>
                <p className="text-[10px] text-slate-500 font-medium">Pending Tasks</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
