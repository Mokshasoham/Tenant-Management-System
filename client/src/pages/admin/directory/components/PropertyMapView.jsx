import React, { useState } from 'react';
import { MapPin, ShieldCheck, Eye, Layers, Maximize2, RotateCcw, Crosshair } from 'lucide-react';
import { VerificationStatusBadge } from '../../../../components/verification';

export default function PropertyMapView({ properties = [], onInspect }) {
  const [hoveredProperty, setHoveredProperty] = useState(null);

  const MARKER_COLORS = {
    VERIFIED: 'bg-emerald-500 text-white',
    PENDING_VERIFICATION: 'bg-amber-500 text-white',
    SUSPENDED: 'bg-slate-700 text-slate-200',
    HIGH_RISK: 'bg-rose-500 text-white',
    PREMIUM: 'bg-purple-600 text-white',
    OCCUPIED: 'bg-blue-600 text-white',
  };

  return (
    <div className="relative w-full h-[600px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col md:flex-row">
      {/* Map Interactive Canvas */}
      <div className="flex-1 relative bg-slate-900/80 p-6 flex flex-col justify-between">
        {/* Floating GIS Map Controls Top Left */}
        <div className="flex items-center gap-2 z-10">
          <button onClick={() => alert('Fitting map to all portfolio properties...')} className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white shadow-lg text-xs font-semibold flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> Reset View
          </button>
          <button onClick={() => alert('Centering on admin geolocation...')} className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white shadow-lg text-xs font-semibold flex items-center gap-1">
            <Crosshair className="w-3.5 h-3.5" /> Locate Me
          </button>
        </div>

        {/* GIS Marker Map Visualization Layer */}
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="w-full h-full rounded-2xl bg-slate-950/60 border border-slate-800/80 relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />
            
            {/* Map Markers */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 z-10 w-full max-w-xl">
              {properties.map((p) => {
                const colorClass = MARKER_COLORS[p.status] || MARKER_COLORS.VERIFIED;

                return (
                  <div
                    key={p.id}
                    onMouseEnter={() => setHoveredProperty(p)}
                    onMouseLeave={() => setHoveredProperty(null)}
                    onClick={() => onInspect && onInspect(p.id)}
                    className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500 shadow-xl cursor-pointer transition-all hover:scale-105 group relative"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${colorClass}`}>
                        {p.status}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">₹{(p.price / 1000).toFixed(0)}k</span>
                    </div>
                    <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400">Trust: <strong className="text-emerald-400">{p.trustScore}</strong></p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Floating Marker Color Legend Bottom Left */}
        <div className="z-10 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md flex items-center gap-4 text-[11px] text-slate-300">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Verified</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> High Risk</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Occupied</span>
        </div>

        {/* Quick Hover Preview Card (Floating Top Right) */}
        {hoveredProperty && (
          <div className="absolute top-4 right-4 z-20 w-64 p-3 rounded-2xl bg-slate-900 border border-indigo-500/50 shadow-2xl space-y-2 animate-in fade-in">
            <h4 className="text-xs font-bold text-white truncate">{hoveredProperty.name}</h4>
            <p className="text-[10px] text-slate-400">{hoveredProperty.address}</p>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-emerald-400 font-bold">Trust {hoveredProperty.trustScore}/100</span>
              <span className="text-indigo-400 font-bold">Health {hoveredProperty.healthScore}/100</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
