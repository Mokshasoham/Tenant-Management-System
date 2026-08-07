import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Award,
  Users,
  Activity,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Lock,
  Filter,
  Eye,
  Settings,
  BarChart2,
  FileText,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  VerificationStatusBadge,
  TrustScoreBadge,
  RiskFlagBadge,
  VerificationPortalLayout,
} from '../../../components/verification';

import getVerificationMapper from '../../../mappers/verificationMapperFactory';
import trackEvent, { VERIFICATION_EVENTS } from '../../../utils/verificationAnalytics';

export default function AdminVerificationDashboard() {
  const navigate = useNavigate();
  const mapper = getVerificationMapper('ADMIN');

  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [highRisk, setHighRisk] = useState([]);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    setStats(mapper.mapDashboard(null));
    setQueue(mapper.mapQueue(null));
    setHighRisk([
      { id: 'hr1', vrf: 'VRF-2026-M00495', entityType: 'MANAGER', entityName: 'Urban Oasis Living Inc', riskLevel: 'CRITICAL', reason: 'GST TIN Mismatch Flag', submittedAgo: '4h ago' },
      { id: 'hr2', vrf: 'VRF-2026-P00914', entityType: 'PROPERTY', entityName: 'Skyline Luxury Towers Apt 402', riskLevel: 'HIGH', reason: 'Title Deed Arrears Alert', submittedAgo: '2.5d ago' },
    ]);
    setActivities(mapper.mapActivities(null));
    trackEvent(VERIFICATION_EVENTS.ADMIN_ANALYTICS_VIEW);
  }, []);

  if (!stats) {
    return <div className="p-8 text-center text-slate-400">Loading Enterprise Verification Control Center...</div>;
  }

  // 1. Header
  const headerComponent = (
    <VerificationPageHeader
      title="Enterprise Verification Control Room"
      subtitle="Unified governance, review queue, compliance analytics, and risk management across Managers, Tenants, Properties, and Technicians"
      icon={ShieldCheck}
      actionText="Open Review Queue"
      onAction={() => navigate('/admin/verification/queue')}
    />
  );

  // 2. Notification Banner
  const bannerComponent = (
    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between text-indigo-300">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
        <div>
          <p className="font-semibold text-sm">Enterprise SLA & High-Risk Alert Monitor</p>
          <p className="text-xs opacity-90">1 request has breached SLA target (48h) and 2 critical high-risk flags require executive sign-off.</p>
        </div>
      </div>
      <button
        onClick={() => navigate('/admin/verification/queue?filter=SLA_BREACHED')}
        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all whitespace-nowrap"
      >
        Inspect Breaches
      </button>
    </div>
  );

  // 3. Hero / 8 KPI Grid
  const heroComponent = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span>Pending Reviews</span>
          <Clock className="w-4 h-4 text-amber-400" />
        </div>
        <p className="text-2xl font-extrabold text-white">{stats.pendingReviews}</p>
        <p className="text-[11px] text-amber-400 font-medium">14 Active in Queue</p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span>Approved Today</span>
          <CheckCircle className="w-4 h-4 text-emerald-400" />
        </div>
        <p className="text-2xl font-extrabold text-white">{stats.approvedToday}</p>
        <p className="text-[11px] text-emerald-400 font-medium">+12% vs Yesterday</p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span>Rejected Today</span>
          <XCircle className="w-4 h-4 text-rose-400" />
        </div>
        <p className="text-2xl font-extrabold text-white">{stats.rejectedToday}</p>
        <p className="text-[11px] text-rose-400 font-medium">9.7% Rejection Rate</p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span>Avg Review SLA</span>
          <Activity className="w-4 h-4 text-indigo-400" />
        </div>
        <p className="text-2xl font-extrabold text-white">{stats.avgReviewTimeMinutes}m</p>
        <p className="text-[11px] text-emerald-400 font-medium">SLA Compliant (96.2%)</p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span>SLA Breaches</span>
          <AlertCircle className="w-4 h-4 text-rose-400" />
        </div>
        <p className="text-2xl font-extrabold text-rose-400">{stats.slaBreaches}</p>
        <p className="text-[11px] text-rose-300 font-medium">Escalated to Level 3</p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span>High Risk Cases</span>
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <p className="text-2xl font-extrabold text-amber-400">{stats.highRiskCases}</p>
        <p className="text-[11px] text-amber-300 font-medium">Requires Audit</p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span>Avg Trust Score</span>
          <Award className="w-4 h-4 text-emerald-400" />
        </div>
        <p className="text-2xl font-extrabold text-white">{stats.avgTrustScore} <span className="text-xs text-slate-400 font-normal">/ 100</span></p>
        <p className="text-[11px] text-emerald-400 font-medium">Enterprise Grade</p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span>Platform Pass Rate</span>
          <TrendingUp className="w-4 h-4 text-indigo-400" />
        </div>
        <p className="text-2xl font-extrabold text-white">{stats.verificationSuccessRate}%</p>
        <p className="text-[11px] text-indigo-300 font-medium">Across 4 Entities</p>
      </div>
    </div>
  );

  // 4. Widget (Control Room Quick Tools)
  const widgetComponent = null;

  // 5. Quick Actions Grid
  const actionsComponent = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <button
        onClick={() => navigate('/admin/verification/queue')}
        className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all text-left group"
      >
        <FileCheck className="w-5 h-5 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
        <h4 className="text-xs font-bold text-slate-200">Review Queue</h4>
        <p className="text-[11px] text-slate-400">Manage 14 Requests</p>
      </button>

      <button
        onClick={() => navigate('/admin/verification/analytics')}
        className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all text-left group"
      >
        <BarChart2 className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
        <h4 className="text-xs font-bold text-slate-200">Analytics</h4>
        <p className="text-[11px] text-slate-400">Trends & SLA Gauges</p>
      </button>

      <button
        onClick={() => navigate('/admin/verification/audit')}
        className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/50 transition-all text-left group"
      >
        <Activity className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
        <h4 className="text-xs font-bold text-slate-200">Audit Log</h4>
        <p className="text-[11px] text-slate-400">Compliance Records</p>
      </button>

      <button
        onClick={() => navigate('/admin/verification/settings')}
        className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/50 transition-all text-left group"
      >
        <Settings className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
        <h4 className="text-xs font-bold text-slate-200">Engine Settings</h4>
        <p className="text-[11px] text-slate-400">Workflows & SLA Rules</p>
      </button>
    </div>
  );

  // 6. Content Grid (Row 1: Queue Preview & High Risk Escalation; Row 2: Expiring & Live Stream)
  const contentComponent = (
    <div className="space-y-6">
      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pending Queue Preview */}
        <div className="lg:col-span-2">
          <VerificationSectionCard title="Pending Review Queue (Top Escalations)" icon={FileText}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">VRF #</th>
                    <th className="py-2.5 px-3">Entity</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Risk</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {queue.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 font-mono text-slate-200">{item.verificationNumber}</td>
                      <td className="py-2.5 px-3 font-bold text-indigo-400">{item.entityType}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-100">{item.entityName}</td>
                      <td className="py-2.5 px-3"><VerificationStatusBadge status={item.status} /></td>
                      <td className="py-2.5 px-3"><RiskFlagBadge risk={item.riskLevel} /></td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => navigate(`/admin/verification/${item.id}`)}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition-all"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </VerificationSectionCard>
        </div>

        {/* Right 1 Col: High Risk Escalation Queue */}
        <VerificationSectionCard title="High Risk Escalation Queue" icon={AlertTriangle}>
          <div className="space-y-3">
            {highRisk.map((hr) => (
              <div key={hr.id} className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-200">{hr.vrf}</span>
                  <RiskFlagBadge risk={hr.riskLevel} />
                </div>
                <p className="text-xs font-semibold text-slate-100">{hr.entityName}</p>
                <p className="text-[11px] text-amber-400 italic">{hr.reason}</p>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
                  <span>{hr.submittedAgo}</span>
                  <button
                    onClick={() => navigate(`/admin/verification/${hr.id}`)}
                    className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                  >
                    Inspect <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </VerificationSectionCard>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VerificationSectionCard title="Expiring Documents Watchlist (All Portals)" icon={Clock}>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Master Trade License (Marcus Vance - TECH)</p>
                <p className="text-[11px] text-slate-400">Expires: 20 Dec 2027 (683 days remaining)</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Valid</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Property Tax Receipt (Skyline Apt 402 - PROP)</p>
                <p className="text-[11px] text-amber-400 font-medium">Expires in 14 days (Renewal due)</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Expiring</span>
            </div>
          </div>
        </VerificationSectionCard>

        <VerificationSectionCard title="Live Verification Audit Log Stream" icon={Activity}>
          <div className="space-y-3">
            {activities.map((act) => (
              <div key={act.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-200">{act.reviewer} · <span className="font-mono text-indigo-400">{act.targetVrf}</span></p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{act.remarks}</p>
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </VerificationSectionCard>
      </div>
    </div>
  );

  // 7. Future Production Hooks
  const integrationsComponent = (
    <VerificationSectionCard title="Future Production Engine Integrations" icon={Lock}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { name: 'AI Document Validation', flag: 'AI_DOCUMENT_VALIDATION' },
          { name: 'OCR Extraction Engine', flag: 'OCR_VERIFICATION' },
          { name: 'Automated Fraud Engine', flag: 'FRAUD_ENGINE' },
          { name: 'Background Screening DB', flag: 'BACKGROUND_SCREENING' },
          { name: 'Auto Reviewer Assigner', flag: 'AUTO_ASSIGN_REVIEWER' },
        ].map((item, idx) => (
          <div key={idx} className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center justify-between opacity-60">
            <span className="text-xs text-slate-300 font-medium">{item.name}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Disabled</span>
          </div>
        ))}
      </div>
    </VerificationSectionCard>
  );

  return (
    <VerificationPortalLayout
      header={headerComponent}
      notification={bannerComponent}
      hero={heroComponent}
      widget={widgetComponent}
      actions={actionsComponent}
      content={contentComponent}
      integrations={integrationsComponent}
    />
  );
}
