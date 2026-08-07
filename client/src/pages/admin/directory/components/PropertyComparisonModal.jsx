import React from 'react';
import { X, Award, CheckCircle, AlertTriangle } from 'lucide-react';

export default function PropertyComparisonModal({ properties = [], isOpen, onClose }) {
  if (!isOpen || !properties || properties.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-5xl rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Admin Property Directory Comparison Matrix</h3>
            <p className="text-xs text-slate-400">Side-by-side compliance & performance comparison for {properties.length} properties</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Metric</th>
                {properties.map((p) => (
                  <th key={p.id} className="py-3 px-4 font-bold text-slate-100">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-400">Monthly Rent</td>
                {properties.map((p) => (
                  <td key={p.id} className="py-3 px-4 font-mono font-bold text-emerald-400">₹{p.price?.toLocaleString()}</td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-400">Trust Score</td>
                {properties.map((p) => (
                  <td key={p.id} className="py-3 px-4 font-extrabold text-emerald-400">{p.trustScore}/100</td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-400">Health Score</td>
                {properties.map((p) => (
                  <td key={p.id} className="py-3 px-4 font-extrabold text-indigo-400">{p.healthScore}/100</td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-400">Compliance Rate</td>
                {properties.map((p) => (
                  <td key={p.id} className="py-3 px-4 font-bold text-emerald-400">{p.complianceScore}%</td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-400">Occupancy %</td>
                {properties.map((p) => (
                  <td key={p.id} className="py-3 px-4 font-bold text-indigo-300">{p.occupancyRate}%</td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-400">Manager Rating</td>
                {properties.map((p) => (
                  <td key={p.id} className="py-3 px-4 text-amber-400 font-bold">{p.managerRating} ★</td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-400">Documents Count</td>
                {properties.map((p) => (
                  <td key={p.id} className="py-3 px-4">{p.documentsCount || 5} Files</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
