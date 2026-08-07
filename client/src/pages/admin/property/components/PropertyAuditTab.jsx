import React from 'react';
import { Activity } from 'lucide-react';
import { VerificationSectionCard } from '../../../../components/verification';
import { MOCK_PROPERTY_AUDIT_LOG } from '../../../../mocks/adminPropertyMock';

export default function PropertyAuditTab({ property }) {
  return (
    <VerificationSectionCard title="Compliance Audit Log & Session Telemetry" icon={Activity}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Reviewer</th>
              <th className="py-2.5 px-3">Action</th>
              <th className="py-2.5 px-3">Remarks</th>
              <th className="py-2.5 px-3 text-right">IP / Session</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {MOCK_PROPERTY_AUDIT_LOG.map((log) => (
              <tr key={log.id} className="hover:bg-slate-900/40">
                <td className="py-2.5 px-3 text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="py-2.5 px-3 font-semibold text-slate-200">{log.reviewer}</td>
                <td className="py-2.5 px-3 font-bold text-amber-400">{log.action}</td>
                <td className="py-2.5 px-3 text-slate-300">{log.remarks}</td>
                <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-400">{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </VerificationSectionCard>
  );
}
