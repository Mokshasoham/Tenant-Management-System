import React from 'react';
import { UserCheck, Star, Award, Building2, Clock, X } from 'lucide-react';

export default function ManagerPortfolioPopover({ manager, onClose }) {
  if (!manager) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-200">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-black text-lg flex items-center justify-center">
            {manager.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{manager.name}</h3>
            <p className="text-xs text-indigo-400 font-medium">Assigned Property Manager</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <p className="text-[10px] text-slate-400">Total Portfolio</p>
            <p className="text-lg font-extrabold text-white mt-0.5">{manager.propertiesCount || 24} Props</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <p className="text-[10px] text-slate-400">Manager Trust</p>
            <p className="text-lg font-extrabold text-emerald-400 mt-0.5">{manager.trust || 95}/100</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <p className="text-[10px] text-slate-400">Manager Rating</p>
            <p className="text-lg font-extrabold text-amber-400 mt-0.5">{manager.rating || 4.9} ★</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <p className="text-[10px] text-slate-400">Avg Response</p>
            <p className="text-lg font-extrabold text-indigo-300 mt-0.5">{manager.responseTime || '1.2h'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
