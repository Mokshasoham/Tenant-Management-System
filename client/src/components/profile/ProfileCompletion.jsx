import React, { memo } from 'react';
import { CheckCircle2, Circle, AlertCircle, ArrowRight } from 'lucide-react';

export const ProfileCompletion = memo(({ completionInfo }) => {
  if (!completionInfo) return null;

  const { percentage, completedCount, totalSections, nextRecommendation, missingSections } = completionInfo;

  const tierLabel = percentage >= 90 ? 'Platinum Tier' : percentage >= 75 ? 'Gold Tier' : percentage >= 50 ? 'Silver Tier' : 'Bronze Tier';
  const tierColor = percentage >= 90 ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : percentage >= 75 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

  return (
    <div className="p-6 rounded-3xl border border-border bg-card/80 backdrop-blur-xl shadow-lg space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2.5">
            Profile Completion Engine
            <span className="text-xs font-extrabold text-emerald-500 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              {percentage}% Complete
            </span>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${tierColor}`}>
              {tierLabel}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {completedCount} of {totalSections} verification sections completed
          </p>
        </div>

        {missingSections.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-2xl shadow-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Next: {nextRecommendation}</span>
          </div>
        )}
      </div>

      {/* Progress Bar with Glow */}
      <div className="w-full bg-muted/60 rounded-full h-3 overflow-hidden p-0.5 border border-border/40">
        <div
          className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 h-2 rounded-full transition-all duration-1000 ease-out shadow-sm shadow-emerald-500/50"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Recommended Section Pill Checklist */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-2">
        {completionInfo.checklist.map(sec => (
          <div
            key={sec.id}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
              sec.isComplete
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'bg-muted/30 border-border/60 text-muted-foreground hover:border-border'
            }`}
          >
            {sec.isComplete ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
            )}
            <span className="truncate">{sec.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

ProfileCompletion.displayName = 'ProfileCompletion';
export default ProfileCompletion;
