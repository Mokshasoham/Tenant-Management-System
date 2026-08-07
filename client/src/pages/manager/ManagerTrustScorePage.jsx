import React from 'react';
import { Award, TrendingUp, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
import useAuthStore from '../../context/authStore';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  TrustScoreCard,
  TrustBreakdownCard,
  TrustHistoryMiniChart,
} from '../../components/verification';

export default function ManagerTrustScorePage() {
  const user = useAuthStore((state) => state.user);
  const { activeVerification } = useVerificationContext();

  const score = activeVerification?.trustScore || user?.currentTrustScore || 85;
  const badge = user?.verificationBadge || 'GOLD';

  const breakdown = [
    { label: 'Identity Verification', score: 30, max: 30 },
    { label: 'Phone & Email Verification', score: 15, max: 15 },
    { label: 'Business Registration / GST', score: 20, max: 20 },
    { label: 'Property Assets Managed', score: 10, max: 15 },
    { label: 'Clean Compliance / No Fraud', score: 10, max: 10 },
  ];

  const history = [
    { value: 0 },
    { value: 45 },
    { value: 70 },
    { value: 85 },
  ];

  const tips = [
    { text: 'Manager Govt ID and Phone number are verified.', completed: true },
    { text: 'Business Registration Certificate uploaded (+20 pts).', completed: true },
    { text: 'Upload Property Tax Receipts for managed properties to gain +5 extra trust points.', completed: false, pts: 5 },
    { text: 'Complete 30 consecutive days of zero maintenance escalation to unlock Platinum status.', completed: false, pts: 10 },
  ];

  return (
    <div className="p-6 sm:p-10 space-y-8">
      <VerificationPageHeader
        title="Manager Trust Score & Credibility Analytics"
        subtitle="Track trust score evolution, component breakdown, and dynamic tips to unlock higher trust badge tiers"
        icon={Award}
        breadcrumbs={[
          { label: 'Manager Portal', href: '/dashboard' },
          { label: 'Verification Home', href: '/manager/verification' },
          { label: 'Trust Score' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TrustScoreCard score={score} badge={badge} />
        <TrustHistoryMiniChart historyData={history} />
      </div>

      <TrustBreakdownCard breakdownItems={breakdown} />

      {/* Dynamic Improvement Suggestions */}
      <VerificationSectionCard title="Dynamic Trust Improvement Tips" subtitle="Actions to maximize your credibility rating" icon={Sparkles}>
        <div className="space-y-3">
          {tips.map((tip, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold ${
                tip.completed
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-600'
              }`}
            >
              <div className="flex items-center gap-3">
                {tip.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                )}
                <span>{tip.text}</span>
              </div>
              {tip.pts && <span className="font-bold underline">+{tip.pts} pts</span>}
            </div>
          ))}
        </div>
      </VerificationSectionCard>
    </div>
  );
}
