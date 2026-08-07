import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, TrendingUp, ShieldCheck, Clock, AlertTriangle, Users, Download } from 'lucide-react';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  CircularProgress,
  MiniBarChart,
  MiniLineChart,
} from '../../../components/verification';

import getVerificationMapper from '../../../mappers/verificationMapperFactory';
import trackEvent, { VERIFICATION_EVENTS } from '../../../utils/verificationAnalytics';

export default function AdminVerificationAnalytics() {
  const navigate = useNavigate();
  const mapper = getVerificationMapper('ADMIN');

  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const data = mapper.mapAnalytics(null);
    setAnalytics(data);
    trackEvent(VERIFICATION_EVENTS.ADMIN_ANALYTICS_VIEW);
  }, []);

  if (!analytics) {
    return <div className="p-8 text-center text-slate-400">Loading Compliance Analytics...</div>;
  }

  return (
    <div className="p-6 sm:p-10 space-y-8">
      {/* Header */}
      <VerificationPageHeader
        title="Verification Executive Analytics & Compliance Insights"
        subtitle="Enterprise telemetry tracking submission throughput, SLA compliance, entity distribution, and risk Pareto"
        icon={BarChart2}
        actionText="Export Report"
        onAction={() => alert('Exported Verification Analytics to Executive PDF.')}
      />

      {/* Top 4 Metric Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>SLA Compliance Rate</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-400">{analytics.slaComplianceRate}%</p>
          <p className="text-xs text-slate-400">96.2% Requests Resolved in SLA</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Avg Processing Time</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-3xl font-extrabold text-white">{analytics.avgProcessingHours}h</p>
          <p className="text-xs text-emerald-400 font-medium">Faster than 24h SLA Target</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Total Verification Volume</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-3xl font-extrabold text-white">300</p>
          <p className="text-xs text-indigo-400 font-medium">Active Requests Across 4 Portals</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Platform Pass Rate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-400">90.3%</p>
          <p className="text-xs text-slate-400">9.7% Overall Rejection Rate</p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Submissions Trend */}
        <VerificationSectionCard title="Weekly Verification Submissions & Approvals" icon={TrendingUp}>
          <div className="space-y-4">
            <MiniBarChart
              data={analytics.submissionsTrend.map((d) => ({
                label: d.date,
                value: d.submissions,
              }))}
              height={160}
              color="#6366F1"
            />
            <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>Peak Day: Friday (35 Submissions)</span>
              <span>Avg Approval Rate: 90.3%</span>
            </div>
          </div>
        </VerificationSectionCard>

        {/* Entity Distribution Breakdown */}
        <VerificationSectionCard title="Entity Distribution (Requests by Portal)" icon={Users}>
          <div className="space-y-4">
            {analytics.entityDistribution.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-200">{item.label}</span>
                  <span className="font-bold text-slate-300">{item.count} Requests ({item.percentage}%)</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </VerificationSectionCard>
      </div>

      {/* Row 2: Top Rejection Reasons & Risk Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VerificationSectionCard title="Top Rejection Reasons Pareto Chart" icon={AlertTriangle}>
          <div className="space-y-3">
            {analytics.topRejectionReasons.map((reason, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">{reason.reason}</span>
                <span className="font-bold text-rose-400">{reason.percentage}% of Rejections</span>
              </div>
            ))}
          </div>
        </VerificationSectionCard>

        <VerificationSectionCard title="Risk Distribution Matrix" icon={ShieldCheck}>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
              <p className="text-xs font-bold text-emerald-400">Low Risk</p>
              <p className="text-2xl font-extrabold text-white mt-1">70%</p>
              <p className="text-[10px] text-slate-400">210 Verified Requests</p>
            </div>

            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-center">
              <p className="text-xs font-bold text-indigo-400">Medium Risk</p>
              <p className="text-2xl font-extrabold text-white mt-1">20%</p>
              <p className="text-[10px] text-slate-400">60 Level 2 Audits</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
              <p className="text-xs font-bold text-amber-400">High Risk</p>
              <p className="text-2xl font-extrabold text-white mt-1">8%</p>
              <p className="text-[10px] text-slate-400">24 Level 3 Audits</p>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center">
              <p className="text-xs font-bold text-rose-400">Critical Risk</p>
              <p className="text-2xl font-extrabold text-white mt-1">2%</p>
              <p className="text-[10px] text-slate-400">6 Escalations</p>
            </div>
          </div>
        </VerificationSectionCard>
      </div>
    </div>
  );
}
