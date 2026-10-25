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
  const currentStepObj = steps.find((s) => s.stepNumber === currentStep) || steps[currentStep - 1] || {};

  return (
    <div
      className={`w-full py-4 ${className}`}
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={steps.length || 6}
      aria-label={t('verification.stepByStepForm', 'Verification Progress')}
    >
      <div className="flex items-center justify-between relative">
        {/* Step Connecting Line Background */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -translate-y-1/2 z-0 rounded-full" />
        {/* Active Progress Fill */}
        <div
          className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 transition-all duration-500 rounded-full"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1 || 1)) * 100}%`,
          }}
        />

        {steps.map((step, idx) => {
          const isCompleted = step.stepNumber < currentStep;
          const isCurrent = step.stepNumber === currentStep;
          const isClickable = Boolean(onStepClick && (isCompleted || isCurrent));

          return (
            <div
              key={step.stepNumber || idx}
              onClick={() => isClickable && onStepClick(step.stepNumber)}
              role="button"
              tabIndex={isClickable ? 0 : -1}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`${step.title || `Step ${step.stepNumber}`} (${isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Pending'})`}
              onKeyDown={(e) => {
                if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onStepClick(step.stepNumber);
                }
              }}
              className={`relative z-10 flex flex-col items-center group select-none transition-transform ${
                isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : isCurrent
                    ? 'bg-primary/20 text-primary border-2 border-primary ring-4 ring-primary/10'
                    : 'bg-card text-muted-foreground border border-border'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : step.stepNumber}
              </div>
              <span
                className={`text-xs font-semibold mt-2 hidden sm:block max-w-[110px] text-center truncate ${
                  isCurrent ? 'text-foreground font-black' : 'text-muted-foreground'
                }`}
                title={step.title}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile Step Title & Progress Pill */}
      {currentStepObj.title && (
        <div className="sm:hidden mt-3 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
            <span>
              {t('verification.stepOf', 'Step {{current}} of {{total}}', {
                current: currentStep,
                total: steps.length || 6,
              })}:
            </span>
            <span className="text-foreground">{currentStepObj.title}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default VerificationProgressStepper;
