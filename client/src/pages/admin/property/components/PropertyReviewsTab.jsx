import React from 'react';
import { Star, ThumbsUp, MessageSquare, ShieldCheck, CheckCircle2, UserCheck } from 'lucide-react';
import { VerificationSectionCard } from '../../../../components/verification';
import { MOCK_TENANT_REVIEWS } from '../../../../mocks/adminPropertyMock';
import { cn } from '../../../../utils/cn';

export default function PropertyReviewsTab({ property, theme }) {
  const reviewsData = MOCK_TENANT_REVIEWS;

  return (
    <div className="space-y-6">
      {/* Overall Score & Category Ratings Breakdown */}
      <VerificationSectionCard title="Tenant Ratings & Experience Score" icon={Star}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Score Box */}
          <div className={cn(
            "p-6 rounded-3xl border flex flex-col items-center justify-center text-center backdrop-blur-xl shadow-xl",
            theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-white/10"
          )}>
            <span className="text-5xl font-black text-amber-400 mb-1">{reviewsData.overallRating}</span>
            <div className="flex items-center gap-1 text-amber-400 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-current" />
              ))}
            </div>
            <p className="text-xs text-muted-foreground font-semibold">
              Based on {reviewsData.totalReviews} Verified Tenant & Resident Reviews
            </p>
          </div>

          {/* Category Breakdown Bars */}
          <div className={cn(
            "md:col-span-2 p-6 rounded-3xl border space-y-3 backdrop-blur-xl shadow-xl",
            theme === 'light' ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-950 border-white/10 text-white"
          )}>
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">
              Category Rating Breakdown
            </h4>

            {[
              { label: 'Location & Connectivity', score: reviewsData.categoryBreakdown.location },
              { label: 'Building Maintenance', score: reviewsData.categoryBreakdown.maintenance },
              { label: '24/7 Security & Safety', score: reviewsData.categoryBreakdown.security },
              { label: 'Cleanliness & Hygiene', score: reviewsData.categoryBreakdown.cleanliness },
              { label: 'Value for Money', score: reviewsData.categoryBreakdown.valueForMoney },
            ].map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>{cat.label}</span>
                  <span className="text-amber-400 font-extrabold">{cat.score} / 5.0</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                    style={{ width: `${(cat.score / 5.0) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </VerificationSectionCard>

      {/* Verified Reviews Stream */}
      <VerificationSectionCard title="Verified Resident & Tenant Reviews" icon={MessageSquare}>
        <div className="space-y-4">
          {reviewsData.reviews.map((rev) => (
            <div
              key={rev.id}
              className={cn(
                "p-5 rounded-3xl border space-y-3 backdrop-blur-xl shadow-xl transition-all",
                theme === 'light' ? "bg-slate-50/80 border-slate-200 text-slate-900" : "bg-slate-950/80 border-white/10 text-white"
              )}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-500/30">
                    {rev.author[0]}
                  </div>
                  <div>
                    <h5 className="text-sm font-bold flex items-center gap-2">
                      {rev.author}
                      {rev.verified && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Verified Resident
                        </span>
                      )}
                    </h5>
                    <p className="text-[11px] text-muted-foreground">{rev.role} · {rev.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 text-xs font-black">
                  <Star className="w-3.5 h-3.5 fill-current" /> {rev.rating}
                </div>
              </div>

              <div>
                <h6 className="text-xs font-black text-slate-100 mb-1">{rev.title}</h6>
                <p className="text-xs text-muted-foreground leading-relaxed">{rev.comment}</p>
              </div>

              {/* Manager Response Thread */}
              {rev.managerResponse && (
                <div className={cn(
                  "p-3.5 rounded-2xl border text-xs space-y-1 mt-3",
                  theme === 'light' ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-white/5"
                )}>
                  <p className="font-bold text-indigo-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" /> Property Manager Response:
                  </p>
                  <p className="text-muted-foreground text-[11px]">{rev.managerResponse}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </VerificationSectionCard>
    </div>
  );
}
