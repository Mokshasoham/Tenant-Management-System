import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Star, TrendingUp, CheckCircle2, ShieldCheck, ChevronRight } from 'lucide-react';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  TrustScoreBadge,
  CircularProgress,
} from '../../components/verification';

import getVerificationMapper from '../../mappers/verificationMapperFactory';
import trackEvent, { VERIFICATION_EVENTS } from '../../utils/verificationAnalytics';

export default function TechnicianTrustScorePage() {
  const navigate = useNavigate();
  const mapper = getVerificationMapper('TECHNICIAN');

  const [trustScore, setTrustScore] = useState(null);

  useEffect(() => {
    const tsData = mapper.mapTrustScore(null);
    setTrustScore(tsData);
    trackEvent(VERIFICATION_EVENTS.TECHNICIAN_TRUST);
  }, []);

  if (!trustScore) {
    return <div className="p-8 text-center text-slate-400">Loading Trust Score...</div>;
  }

  return (
    <div className="p-6 sm:p-10 space-y-8">
      {/* Header */}
      <VerificationPageHeader
        title="Technician Trust Score & Trade Analytics"
        subtitle="Detailed scoring breakdown measuring trade competency, certifications, ratings, and dispatch reliability"
        icon={Award}
      />

      {/* Hero Banner Card */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <CircularProgress value={trustScore.score} max={100} size={120} strokeWidth={10} color="#10B981" />
          <div className="space-y-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {trustScore.statusTitle}
            </span>
            <h2 className="text-3xl font-extrabold text-white">{trustScore.score} <span className="text-sm font-normal text-slate-400">/ 100</span></h2>
            <p className="text-xs text-slate-300 font-medium">{trustScore.percentileText}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <TrustScoreBadge score={trustScore.score} />
          <button
            onClick={() => navigate('/technician/verification/wizard')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all"
          >
            Improve Trust Score
          </button>
        </div>
      </div>

      {/* Score Category Breakdown */}
      <VerificationSectionCard title="Score Category Breakdown" icon={TrendingUp}>
        <div className="space-y-4">
          {trustScore.breakdown.map((item, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">{item.label}</span>
                <span className="font-bold text-emerald-400">
                  {item.score} / {item.max} Points
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${(item.score / item.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </VerificationSectionCard>

      {/* "Why is my score 91?" Itemized Breakdown Table */}
      <VerificationSectionCard title="Why is my score 91? (Line-Item Audit)" icon={ShieldCheck}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Evaluation Criteria</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Points Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {trustScore.breakdown.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40">
                  <td className="py-3 px-4 font-semibold text-slate-200">{item.label}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'complete'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : item.status === 'partial'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-400">+{item.score}</td>
                </tr>
              ))}
              <tr className="bg-slate-950/80 font-bold">
                <td className="py-3 px-4 text-slate-100" colSpan={2}>
                  Net Verified Technician Trust Score
                </td>
                <td className="py-3 px-4 text-right text-emerald-400 text-sm">91 / 100</td>
              </tr>
            </tbody>
          </table>
        </div>
      </VerificationSectionCard>

      {/* Actionable Improvement Suggestions */}
      <VerificationSectionCard title="Recommended Actions to Reach 100 Score" icon={CheckCircle2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trustScore.tips.map((tip) => (
            <div
              key={tip.id}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-xs font-bold text-slate-200">{tip.text}</p>
                <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">+{tip.points} Trust Points</p>
              </div>
              <button
                disabled={tip.completed}
                onClick={() => navigate('/technician/verification/wizard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tip.completed
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                }`}
              >
                {tip.completed ? 'Completed ✓' : 'Action'}
              </button>
            </div>
          ))}
        </div>
      </VerificationSectionCard>
    </div>
  );
}
