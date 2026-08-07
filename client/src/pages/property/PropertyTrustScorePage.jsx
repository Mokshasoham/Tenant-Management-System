import React from 'react';
import { Award, TrendingUp, Sparkles, CheckCircle2, AlertCircle, HelpCircle, Activity } from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
import { trackEvent, VERIFICATION_EVENTS } from '../../utils/verificationAnalytics';
import getVerificationMapper from '../../mappers/verificationMapperFactory';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  TrustBreakdownCard,
  TrustHistoryMiniChart,
  CircularProgress,
  TrustScoreBadge,
  VerificationEmptyState,
} from '../../components/verification';
import { Button } from '../../components/PremiumUI';

export default function PropertyTrustScorePage() {
  const { activeVerification } = useVerificationContext();

  const propertyMapper = getVerificationMapper('PROPERTY');
  const trustData = propertyMapper.mapTrustScore(activeVerification?.trustScoreData);
  const healthScore = propertyMapper.mapPropertyHealth(activeVerification?.propertyHealth);

  const handleTipClick = (tipId) => {
    trackEvent(VERIFICATION_EVENTS.IMPROVEMENT_TIP_CLICKED, { tipId });
  };

  return (
    <div className="p-6 sm:p-10 space-y-8">
      <VerificationPageHeader
        title="Property Trust & Health Analytics"
        subtitle="Detailed 0-100 real estate trust breakdown, physical condition health score, and safety compliance tips"
        icon={Award}
        breadcrumbs={[
          { label: 'Property Operations', href: '/properties' },
          { label: 'Property Verification', href: '/property/verification' },
          { label: 'Trust Analytics' },
        ]}
      />

      {/* Trust Hero & Evolution Trend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <VerificationSectionCard title="Property Trust Score" subtitle={trustData.statusTitle} icon={Award}>
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

        {/* Enhancement #4: Property Health Score Card */}
        <VerificationSectionCard title="Property Completeness Health" subtitle="Data completeness & documentation health" icon={Activity}>
          <div className="space-y-3 pt-1 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="font-bold text-emerald-600">Property Health Rating</span>
              <span className="text-lg font-black text-emerald-600">{healthScore.healthScorePercent}%</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                <p className="text-[10px] text-muted-foreground font-semibold">Documents</p>
                <p className="text-xs font-black text-foreground">{healthScore.metrics.documentsUploaded}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                <p className="text-[10px] text-muted-foreground font-semibold">Verified Photos</p>
                <p className="text-xs font-black text-foreground">{healthScore.metrics.photosUploaded}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                <p className="text-[10px] text-muted-foreground font-semibold">Amenities</p>
                <p className="text-xs font-black text-foreground">{healthScore.metrics.amenitiesVerified}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                <p className="text-[10px] text-muted-foreground font-semibold">Inspection</p>
                <p className="text-xs font-black text-foreground">{healthScore.metrics.inspectionsCompleted}</p>
              </div>
            </div>
          </div>
        </VerificationSectionCard>

        <VerificationSectionCard title="6-Month Score Trend" subtitle="Historical score evolution" icon={TrendingUp}>
          <TrustHistoryMiniChart />
        </VerificationSectionCard>
      </div>

      {/* "Why is my score 88?" Breakdown Table */}
      <VerificationSectionCard
        title={`Why is my score ${trustData.score}?`}
        subtitle="Itemized title, tax, legal, and physical condition point allocation"
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
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-black text-sm">
                  <td className="py-3 px-3 text-foreground" colSpan={2}>Net Property Trust Score Total</td>
                  <td className="py-3 px-3 text-right text-emerald-500">{trustData.netScore} / 100</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </VerificationSectionCard>

      {/* Category Breakdown Progress */}
      <TrustBreakdownCard breakdown={trustData.breakdown} />

      {/* Actionable Improvement Suggestions */}
      <VerificationSectionCard title="Compliance Improvement Suggestions" subtitle="Complete missing safety and NOC certificates to reach 100/100" icon={Sparkles}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
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
