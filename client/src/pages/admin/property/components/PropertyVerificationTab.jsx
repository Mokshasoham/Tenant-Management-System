import React from 'react';
import { ShieldCheck, CheckCircle, AlertTriangle } from 'lucide-react';
import { VerificationSectionCard, CircularProgress } from '../../../../components/verification';

export default function PropertyVerificationTab({ property }) {
  if (!property) return null;

  return (
    <div className="space-y-6">
      <VerificationSectionCard title="Verification Readiness & Triple Metrics" icon={ShieldCheck}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4">
            <CircularProgress value={property.trustScore} max={100} size={70} strokeWidth={6} color="#10B981" />
            <div>
              <p className="text-xs text-slate-400 font-semibold">Trust Score</p>
              <p className="text-xl font-extrabold text-white">{property.trustScore} / 100</p>
              <p className="text-[10px] text-emerald-400 font-medium">Enterprise Grade</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4">
            <CircularProgress value={property.healthScore} max={100} size={70} strokeWidth={6} color="#6366F1" />
            <div>
              <p className="text-xs text-slate-400 font-semibold">Health Score</p>
              <p className="text-xl font-extrabold text-white">{property.healthScore} / 100</p>
              <p className="text-[10px] text-indigo-400 font-medium">Excellent Structural Health</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4">
            <CircularProgress value={property.complianceScore} max={100} size={70} strokeWidth={6} color="#10B981" />
            <div>
              <p className="text-xs text-slate-400 font-semibold">Compliance Rate</p>
              <p className="text-xl font-extrabold text-white">{property.complianceScore}%</p>
              <p className="text-[10px] text-emerald-400 font-medium">Fully Compliant</p>
            </div>
          </div>
        </div>
      </VerificationSectionCard>
    </div>
  );
}
