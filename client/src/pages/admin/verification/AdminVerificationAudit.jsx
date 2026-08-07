import React, { useState, useEffect } from 'react';
import { Activity, Search, Filter, Download, ShieldCheck, Clock } from 'lucide-react';
import {
  VerificationPageHeader,
  VerificationSectionCard,
} from '../../../components/verification';

import getVerificationMapper from '../../../mappers/verificationMapperFactory';
import trackEvent, { VERIFICATION_EVENTS } from '../../../utils/verificationAnalytics';

export default function AdminVerificationAudit() {
  const mapper = getVerificationMapper('ADMIN');

  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');

  useEffect(() => {
    const auditData = mapper.mapAudit(null);
    setLogs(auditData);
    trackEvent(VERIFICATION_EVENTS.ADMIN_AUDIT_VIEW);
  }, []);

  const handleExportCSV = () => {
    trackEvent(VERIFICATION_EVENTS.ADMIN_EXPORT, { format: 'CSV', page: 'audit' });
    alert('Exported compliance audit logs to CSV.');
  };

  const handleExportPDF = () => {
    trackEvent(VERIFICATION_EVENTS.ADMIN_EXPORT, { format: 'PDF', page: 'audit' });
    alert('Exported compliance audit report to PDF.');
  };

  const filteredLogs = logs.filter((log) => {
    if (entityFilter !== 'ALL' && log.entityType !== entityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const rev = (log.reviewer || '').toLowerCase();
      const vrf = (log.targetVrf || '').toLowerCase();
      const remarks = (log.remarks || '').toLowerCase();
      return rev.includes(q) || vrf.includes(q) || remarks.includes(q);
    }
    return true;
  });

  return (
    <div className="p-6 sm:p-10 space-y-8">
      {/* Header */}
      <VerificationPageHeader
        title="Enterprise Compliance Audit Center"
        subtitle="Immutable audit log tracking reviewer actions, state mutations, document inspections, and session telemetry"
        icon={Activity}
        actionText="Export CSV"
        onAction={handleExportCSV}
      />

      {/* Search & Filter Bar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviewer, VRF #, or audit remarks..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Entity Portals</option>
            <option value="MANAGER">Manager</option>
            <option value="TENANT">Tenant</option>
            <option value="PROPERTY">Property</option>
            <option value="TECHNICIAN">Technician</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" /> Export PDF
          </button>
        </div>
      </div>

      {/* Main Audit Log Table */}
      <VerificationSectionCard title={`Enterprise Audit Records (${filteredLogs.length} Events)`} icon={ShieldCheck}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Reviewer</th>
                <th className="py-3 px-3">Entity</th>
                <th className="py-3 px-3">VRF #</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Old → New</th>
                <th className="py-3 px-3">Remarks</th>
                <th className="py-3 px-3 text-right">IP / Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-200">{log.reviewer}</td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {log.entityType}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-slate-200">{log.targetVrf}</td>
                  <td className="py-3 px-3 font-semibold text-amber-400">{log.action}</td>
                  <td className="py-3 px-3 text-slate-400">
                    <span className="text-slate-500">{log.oldValue}</span> → <span className="text-emerald-400 font-semibold">{log.newValue}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-300 max-w-xs truncate">{log.remarks}</td>
                  <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-400">
                    {log.ip} <span className="text-slate-600">({log.session})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </VerificationSectionCard>
    </div>
  );
}
