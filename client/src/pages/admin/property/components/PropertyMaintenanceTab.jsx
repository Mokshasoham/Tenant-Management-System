import React from 'react';
import { Wrench, CheckCircle, Clock } from 'lucide-react';
import { VerificationSectionCard } from '../../../../components/verification';

export default function PropertyMaintenanceTab({ property }) {
  const tickets = [
    { id: 'm1', issue: 'HVAC Air Conditioner Servicing & AMC Inspection', category: 'HVAC', status: 'COMPLETED', cost: '₹3,500', date: '2026-06-10' },
    { id: 'm2', issue: 'Plumbing Leakage Repair in Master Bathroom', category: 'Plumbing', status: 'IN_PROGRESS', cost: '₹1,200', date: '2026-07-18' },
  ];

  return (
    <VerificationSectionCard title="Maintenance Tickets & AMC Inspection History" icon={Wrench}>
      <div className="space-y-3 text-xs">
        {tickets.map((t) => (
          <div key={t.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-200">{t.issue}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{t.category} · Scheduled: {t.date}</p>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-emerald-400 block">{t.cost}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${t.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                {t.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </VerificationSectionCard>
  );
}
