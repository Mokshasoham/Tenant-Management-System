import React from 'react';
import { Home, Building2, MapPin, X, ArrowRight } from 'lucide-react';

export default function RelatedPropertiesDrawer({ property, isOpen, onClose, onInspect }) {
  if (!isOpen || !property) return null;

  const mockRelated = [
    { id: 'rel_1', name: 'Skyline Luxury Towers - Apt 403', type: 'Same Building', rent: '₹46,000', trust: 94 },
    { id: 'rel_2', name: 'Jubilee Hills Villa 14', type: 'Same Manager', rent: '₹92,000', trust: 88 },
    { id: 'rel_3', name: 'Banjara Heights Apt 101', type: 'Nearby (0.8 KM)', rent: '₹42,000', trust: 90 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 p-6 space-y-6 h-full overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Related Properties Investigation</h3>
            <p className="text-xs text-slate-400">Contextual properties linked to {property.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {mockRelated.map((item) => (
            <div key={item.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {item.type}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">{item.rent}</span>
              </div>
              <h4 className="text-xs font-bold text-slate-200">{item.name}</h4>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800/80 text-xs">
                <span className="text-slate-400">Trust Score: <strong className="text-emerald-400">{item.trust}/100</strong></span>
                <button
                  onClick={() => onInspect && onInspect(item.id)}
                  className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 text-[11px]"
                >
                  Inspect <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
