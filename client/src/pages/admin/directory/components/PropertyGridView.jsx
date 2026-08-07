import React from 'react';
import { Building2, Bed, Bath, Square, MapPin, CheckCircle, AlertTriangle, Eye, ShieldCheck, FileText, UserCheck } from 'lucide-react';
import { VerificationStatusBadge, RiskFlagBadge } from '../../../../components/verification';

export default function PropertyGridView({
  properties = [],
  selectedIds = [],
  onToggleSelect,
  onInspect,
  onOpenManager,
}) {
  if (!properties || properties.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 bg-slate-900/50 border border-slate-800 rounded-3xl">
        <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-2" />
        <p className="font-bold text-slate-200">No properties matched directory criteria</p>
        <p className="text-xs text-slate-500 mt-1">Try resetting filters or expanding search terms</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map((p) => {
        const isSelected = selectedIds.includes(p.id);

        return (
          <div
            key={p.id}
            className={`rounded-3xl overflow-hidden bg-slate-900 border transition-all shadow-lg hover:shadow-2xl group flex flex-col justify-between ${
              isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              {/* Card Image Header */}
              <div className="h-48 bg-slate-950 relative overflow-hidden">
                <img
                  src={p.images?.[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

                {/* Select Checkbox Top Left */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect && onToggleSelect(p.id)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950/80 text-white border border-slate-800">
                    {p.propertyId}
                  </span>
                </div>

                {/* Status Badge Top Right */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <VerificationStatusBadge status={p.status} />
                </div>

                {/* Duplicate Alert Flag */}
                {p.isDuplicate && (
                  <div className="absolute bottom-3 left-3 bg-rose-600/90 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-400/30">
                    <AlertTriangle className="w-3 h-3" /> Duplicate
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm group-hover:text-indigo-400 transition-colors line-clamp-1">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" /> {p.address}
                  </p>
                </div>

                {/* Compact Triple Metrics Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Trust {p.trustScore}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Health {p.healthScore}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Compliance {p.complianceScore}%
                  </span>
                </div>

                {/* Spec Badges */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <Bed className="w-3.5 h-3.5 text-slate-500" /> {p.bedrooms} Beds
                  </div>
                  <div className="flex items-center gap-1">
                    <Bath className="w-3.5 h-3.5 text-slate-500" /> {p.bathrooms} Baths
                  </div>
                  <div className="flex items-center gap-1">
                    <Square className="w-3.5 h-3.5 text-slate-500" /> {p.areaSqFt} sqft
                  </div>
                </div>

                {/* Rent & Manager */}
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Monthly Rent</span>
                    <span className="font-mono font-extrabold text-emerald-400 text-sm">₹{p.price?.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => onOpenManager && onOpenManager({ name: p.managerName, trust: p.managerTrust, rating: p.managerRating, propertiesCount: p.managerPropertiesCount })}
                    className="text-right hover:text-indigo-300 transition-colors"
                  >
                    <span className="text-[10px] text-slate-500 block">Manager</span>
                    <span className="font-semibold text-slate-300 truncate max-w-[120px] block">{p.managerName}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card Footer Admin Actions */}
            <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => onInspect && onInspect(p.id)}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> Inspect 360° Workspace
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
