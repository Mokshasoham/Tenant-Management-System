import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCheck, Star, Building, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { cn } from '../../../../utils/cn';
import { MOCK_MANAGERS } from '../../../../mocks/adminPeopleMock';

export default function AdminManagerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const manager = MOCK_MANAGERS.find((m) => m.id === id) || MOCK_MANAGERS[0];

  return (
    <div className={cn(
      "min-h-screen p-4 sm:p-8 space-y-6 max-w-[1600px] mx-auto font-sans transition-colors",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-[#050508] text-slate-100"
    )}>
      <button
        onClick={() => navigate('/admin/people/managers')}
        className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Managers Directory
      </button>

      {/* Header (NO EDIT/DELETE BUTTONS) */}
      <div className={cn(
        "p-6 rounded-[2.25rem] border shadow-2xl space-y-4 backdrop-blur-2xl transition-all",
        theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black flex items-center justify-center text-xl shadow-lg">
              {manager.name?.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{manager.name}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  ● Active Manager
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                ID: {manager.id} · {manager.email} · {manager.phone}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-muted-foreground font-bold block">Portfolio Score</span>
            <p className="font-mono font-black text-amber-400 text-base flex items-center justify-end gap-1">
              <Star className="w-4 h-4 fill-current" /> {manager.rating} Rating
            </p>
          </div>
        </div>
      </div>

      {/* Managed Properties Portfolio View */}
      <div className={cn(
        "p-6 rounded-[2.25rem] border shadow-2xl space-y-4 backdrop-blur-2xl",
        theme === 'light' ? "bg-white/80 border-slate-200/80 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
      )}>
        <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
          Managed Properties Portfolio ({manager.managedProperties?.length || 3})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(manager.managedProperties || []).map((p, idx) => (
            <div key={idx} className="p-4 rounded-2xl border bg-slate-900/40 border-white/5 space-y-1">
              <h4 className="font-extrabold text-sm text-indigo-400">{p.name}</h4>
              <p className="text-xs text-muted-foreground font-medium">📍 {p.city} · {p.units} Units</p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 inline-block mt-2">
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
