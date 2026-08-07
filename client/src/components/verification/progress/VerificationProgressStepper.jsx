import React from 'react';
import { Check } from 'lucide-react';

export const VerificationProgressStepper = ({
  steps = [],
  currentStep = 1,
  onStepClick,
  className = '',
}) => {
  return (
    <div className={`w-full py-4 ${className}`}>
      <div className="flex items-center justify-between relative">
        {/* Step Connecting Line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -translate-y-1/2 z-0" />
        <div
          className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 transition-all duration-500"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1 || 1)) * 100}%`,
          }}
        />

        {steps.map((step, idx) => {
          const isCompleted = step.stepNumber < currentStep;
          const isCurrent = step.stepNumber === currentStep;

          return (
            <div
              key={step.stepNumber || idx}
              onClick={() => onStepClick && onStepClick(step.stepNumber)}
              className="relative z-10 flex flex-col items-center cursor-pointer group"
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
                className={`text-xs font-semibold mt-2 hidden sm:block ${
                  isCurrent ? 'text-foreground font-black' : 'text-muted-foreground'
                }`}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VerificationProgressStepper;
