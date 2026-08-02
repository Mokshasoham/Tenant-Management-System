import React, { memo } from 'react';
import { CheckCircle2, Circle, AlertCircle, ArrowRight } from 'lucide-react';

export const ProfileCompletion = memo(({ completionInfo }) => {
  if (!completionInfo) return null;

  const { percentage, completedCount, totalSections, nextRecommendation, missingSections } = completionInfo;

  return (
    <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            Profile Completion Engine
            <span className="text-xs font-extrabold text-emerald-500 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              {percentage}% Complete
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            {completedCount} of {totalSections} verification sections completed
          </p>
        </div>

        {missingSections.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
            <AlertCircle className="w-4 h-4" />
            <span>Next: {nextRecommendation}</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Recommended Section Pill Checklist */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
        {completionInfo.checklist.map(sec => (
          <div
            key={sec.id}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-colors ${
              sec.isComplete
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-muted/40 border-border/60 text-muted-foreground'
            }`}
          >
            {sec.isComplete ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
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
