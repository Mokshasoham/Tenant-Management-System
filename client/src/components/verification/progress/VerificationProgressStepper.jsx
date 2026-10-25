import React from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export const VerificationProgressStepper = ({
  steps = [],
  currentStep = 1,
  onStepClick,
  className = '',
}) => {
  const { t } = useLanguage();
  const totalSteps = steps.length || 6;
  const currentStepObj = steps.find((s) => s.stepNumber === currentStep) || steps[currentStep - 1] || {};
  const currentTitle = currentStepObj.title || `${t('verification.step', 'Step')} ${currentStep}`;
  const pct = Math.round(((currentStep - 1) / (totalSteps - 1 || 1)) * 100);

  return (
    <nav
      className={`w-full py-4 select-none ${className}`}
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuetext={t('verification.stepsCompletedCounter', '{{completed}} of {{total}} required verification steps completed', {
        completed: currentStep,
        total: totalSteps,
      })}
      aria-label={t('verification.stepByStepForm', 'Verification Progress')}
    >
      <div className="relative">
        {/* Step Connecting Line Track - Aligned to circle centers (18px from top) */}
        <div className="absolute top-[18px] sm:top-[18px] left-[18px] right-[18px] h-1 bg-muted/80 z-0 rounded-full" />
        
        {/* Active Progress Fill */}
        <div
          className="absolute top-[18px] sm:top-[18px] left-[18px] h-1 bg-primary z-0 transition-all duration-500 rounded-full"
          style={{
            width: `calc(${((currentStep - 1) / (totalSteps - 1 || 1)) * 100}% - 4px)`,
          }}
        />

        <div className="relative z-10 flex items-start justify-between">
          {steps.map((step, idx) => {
            const stepNum = step.stepNumber || idx + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            const isClickable = Boolean(onStepClick && (isCompleted || isCurrent));

            const stateText = isCompleted
              ? t('verification.completed', 'Completed')
              : isCurrent
              ? t('verification.current', 'Current')
              : t('verification.pending', 'Pending');

            return (
              <div
                key={stepNum}
                onClick={() => isClickable && onStepClick(stepNum)}
                role="button"
                tabIndex={isClickable ? 0 : -1}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${step.title || `${t('verification.step', 'Step')} ${stepNum}`}: ${stateText}`}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onStepClick(stepNum);
                  }
                }}
                className={`flex flex-col items-center flex-1 min-w-0 transition-all ${
                  isClickable ? 'cursor-pointer group' : 'cursor-default'
                }`}
              >
                {/* Step Circle Indicator */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground shadow-sm group-hover:scale-105 ring-2 ring-primary/20'
                      : isCurrent
                      ? 'bg-card text-primary border-2 border-primary ring-4 ring-primary/15 scale-105 shadow-md font-black'
                      : 'bg-card text-muted-foreground border border-border group-hover:border-primary/40'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : stepNum}
                </div>

                {/* Desktop/Tablet 2-Line Wrapped Title (Zero Truncation or Ellipsis Clipping) */}
                <span
                  className={`mt-2.5 hidden sm:flex items-center justify-center text-center text-xs leading-snug px-1.5 max-w-[128px] min-h-[2.5rem] break-words transition-colors ${
                    isCurrent
                      ? 'text-foreground font-black'
                      : isCompleted
                      ? 'text-foreground/80 font-semibold'
                      : 'text-muted-foreground font-medium'
                  }`}
                  title={step.title}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Active Step Pill Indicator */}
      <div className="sm:hidden mt-4 flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40 border border-border">
        <span className="text-xs font-bold text-foreground truncate max-w-[70%]">
          {t('verification.stepOf', 'Step {{current}} of {{total}}', {
            current: currentStep,
            total: totalSteps,
          })}: <span className="text-primary font-black">{currentTitle}</span>
        </span>
        <span className="text-[11px] font-bold text-muted-foreground px-2 py-0.5 rounded-full bg-card border border-border">
          {pct}%
        </span>
      </div>
    </nav>
  );
};

export default VerificationProgressStepper;
