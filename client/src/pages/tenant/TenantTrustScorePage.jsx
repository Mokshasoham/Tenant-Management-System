import React from 'react';
import { Award, TrendingUp, Sparkles, CheckCircle2, AlertCircle, HelpCircle, ShieldCheck } from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
import useAuthStore from '../../context/authStore';
import { trackEvent, VERIFICATION_EVENTS } from '../../utils/verificationAnalytics';
import { mapTrustScore } from '../../mappers/tenantVerificationMapper';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  TrustScoreCard,
  TrustBreakdownCard,
  TrustHistoryMiniChart,
  CircularProgress,
  TrustScoreBadge,
  VerificationEmptyState,
} from '../../components/verification';
import { Button } from '../../components/PremiumUI';

export default function TenantTrustScorePage() {
  const user = useAuthStore((state) => state.user);
  const { activeVerification } = useVerificationContext();

  const trustData = mapTrustScore(activeVerification?.trustScoreData, user, activeVerification);

  const handleTipClick = (tipId) => {
    trackEvent(VERIFICATION_EVENTS.IMPROVEMENT_TIP_CLICKED, { tipId });
  };

  return (
    <div className="p-6 sm:p-10 space-y-8">
      <VerificationPageHeader
        title="Tenant Rental Trust Analytics"
        subtitle="Detailed 0-100 score breakdown, percentile standing, score evolution, and actionable improvement tips"
        icon={Award}
        breadcrumbs={[
          { label: 'Tenant Portal', href: '/dashboard' },
          { label: 'Verification Home', href: '/tenant/verification' },
          { label: 'Trust Analytics' },
        ]}
      />

      {/* Enhancement #15: Enhanced Trust Score Hero & Evolution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <VerificationSectionCard title="Score Gauge" subtitle={trustData.statusTitle} icon={Award}>
          <div className="flex flex-col items-center justify-center space-y-3 pt-1 text-center">
            <CircularProgress value={trustData.score} max={100} size={130} strokeWidth={10} color="#10b981">
              <div className="text-center">
                <span className="text-3xl font-black text-foreground">{trustData.score}</span>
                <span className="text-xs text-muted-foreground block font-semibold">/100</span>
              </div>
            </CircularProgress>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-500 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                {trustData.percentileText}
              </span>
              <TrustScoreBadge badge={trustData.badge} />
            </div>
            <p className="text-xs font-bold text-foreground">{trustData.statusTitle}</p>
          </div>
        </VerificationSectionCard>

        <div className="md:col-span-2">
          <TrustHistoryMiniChart historyData={trustData?.history || []} />
        </div>
      </div>

      {/* Enhancement #8: Trust Score Explanation ("Why is my score X?") */}
      <VerificationSectionCard
        title={`Why is my score ${trustData.score}?`}
        subtitle="Itemized point allocation breakdown and penalty deductions"
        icon={HelpCircle}
      >
        <div className="space-y-4 pt-1 text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-bold">
                  <th className="py-2.5 px-3">Verification Category</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Points Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trustData.breakdown.map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    <td className="py-2.5 px-3 font-semibold text-foreground">{item.label}</td>
                    <td className="py-2.5 px-3 text-center">
                      {item.score === item.max ? (
                        <span className="inline-flex items-center gap-1 text-emerald-500 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Full
                        </span>
                      ) : item.score > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
                          <AlertCircle className="w-3.5 h-3.5" /> Partial
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          Missing
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-500">
                      +{item.score} <span className="text-muted-foreground font-normal">/ {item.max}</span>
                    </td>
                  </tr>
                ))}

                {/* Penalty Rows */}
                {trustData.penalties.map((pen, idx) => (
                  <tr key={`pen_${idx}`} className="bg-rose-500/5 hover:bg-rose-500/10">
                    <td className="py-2.5 px-3 font-semibold text-rose-600">Deduction: {pen.reason}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-rose-600">Penalty</td>
                    <td className="py-2.5 px-3 text-right font-black text-rose-600">{pen.deduction} pts</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-black text-sm">
                  <td className="py-3 px-3 text-foreground" colSpan={2}>Net Trust Score Total</td>
                  <td className="py-3 px-3 text-right text-emerald-500">{trustData.netScore} / 100</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Your Trust Score is dynamically calculated based on verified identity, phone & email validation, address proof, employment records, rental history, and conduct penalties.
          </p>
        </div>
      </VerificationSectionCard>

      {/* Category Breakdown Progress */}
      <TrustBreakdownCard breakdown={trustData.breakdown} />

      {/* Actionable Improvement Suggestions */}
      <VerificationSectionCard title="Actionable Improvement Suggestions" subtitle="Complete missing steps to boost your score" icon={Sparkles}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {trustData.tips.map((tip) => (
            <div
              key={tip.id}
              onClick={() => handleTipClick(tip.id)}
              className={`p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                tip.completed
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-foreground'
                  : 'bg-muted/30 border-border hover:bg-muted/60 text-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                {tip.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-bold">{tip.text}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {tip.completed ? 'Completed' : 'Pending verification action'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-emerald-500 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                +{tip.points} pts
              </span>
            </div>
          ))}
        </div>
      </VerificationSectionCard>
    </div>
  );
}
