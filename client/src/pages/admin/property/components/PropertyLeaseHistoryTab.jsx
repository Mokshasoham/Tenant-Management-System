import React from 'react';
import { FileText, Users, Calendar } from 'lucide-react';
import { VerificationSectionCard } from '../../../../components/verification';

export default function PropertyLeaseHistoryTab({ property }) {
  const leaseHistory = [
    { id: 'l1', tenant: 'Aarav Patel', duration: '01 Feb 2026 – 31 Jan 2027', rent: '₹45,000', status: 'ACTIVE' },
    { id: 'l2', tenant: 'Sneha Reddy', duration: '01 Jan 2025 – 31 Dec 2025', rent: '₹42,000', status: 'EXPIRED' },
    { id: 'l3', tenant: 'Rohan Gupta', duration: '01 Jan 2024 – 31 Dec 2024', rent: '₹40,000', status: 'EXPIRED' },
  ];

  return (
    <VerificationSectionCard title="Property Lease & Rental Yield History" icon={FileText}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Tenant Name</th>
              <th className="py-2.5 px-3">Lease Duration</th>
              <th className="py-2.5 px-3">Monthly Rent</th>
              <th className="py-2.5 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {leaseHistory.map((l) => (
              <tr key={l.id} className="hover:bg-slate-900/40">
                <td className="py-2.5 px-3 font-semibold text-slate-100">{l.tenant}</td>
                <td className="py-2.5 px-3 text-slate-400">{l.duration}</td>
                <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{l.rent}</td>
                <td className="py-2.5 px-3 text-right">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${l.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                    {l.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </VerificationSectionCard>
  );
}
