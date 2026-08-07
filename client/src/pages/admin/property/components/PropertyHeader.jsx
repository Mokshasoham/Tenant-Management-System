import React from 'react';
import { ChevronLeft, Building2, ShieldCheck, Award, MapPin, Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PropertyHeader({ property }) {
  const navigate = useNavigate();

  if (!property) return null;

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb Nav & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 mb-2"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Properties Directory
          </button>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white">{property.name}</h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              {property.propertyId}
            </span>
          </div>

          <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" /> {property.address}
          </p>
        </div>

        {/* Top-Right Triple Metrics Badges */}
        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-xl">
          <div className="text-center px-2">
            <span className="text-[10px] text-slate-400 block font-medium">Trust Score</span>
            <span className="text-lg font-extrabold text-emerald-400">{property.trustScore}/100</span>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="text-center px-2">
            <span className="text-[10px] text-slate-400 block font-medium">Health Score</span>
            <span className="text-lg font-extrabold text-indigo-400">{property.healthScore}/100</span>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="text-center px-2">
            <span className="text-[10px] text-slate-400 block font-medium">Compliance</span>
            <span className="text-lg font-extrabold text-emerald-400">{property.complianceScore}%</span>
          </div>
        </div>
      </div>

      {/* Activity Ribbon Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(property.ribbonChips || []).map((chip, idx) => (
          <div
            key={idx}
            className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="text-slate-400">{chip.label}:</span>
            <span className="text-indigo-400 font-bold">{chip.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
