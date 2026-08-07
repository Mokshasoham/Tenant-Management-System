import React from 'react';
import { ShieldAlert, Shield, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '../../PremiumUI';

export const VerificationEmptyState = ({
  icon = 'ShieldAlert',
  title = 'No Verification Found',
  description = 'Start your verification process to unlock platform features and build trust credentials.',
  actionText = 'Begin Verification',
  onAction,
  className = '',
}) => {
  const renderIcon = () => {
    switch (icon) {
      case 'Shield':
        return <Shield className="w-8 h-8 text-primary" />;
      case 'FileText':
        return <FileText className="w-8 h-8 text-primary" />;
      case 'CheckCircle2':
        return <CheckCircle2 className="w-8 h-8 text-emerald-500" />;
      default:
        return <ShieldAlert className="w-8 h-8 text-amber-500" />;
    }
  };

  return (
    <div className={`p-8 sm:p-12 text-center rounded-2xl border border-border bg-card/60 glass-card flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className="p-4 rounded-2xl bg-muted border border-border">{renderIcon()}</div>
      <h3 className="text-lg font-black text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      {actionText && onAction && (
        <Button variant="primary" onClick={onAction} className="mt-2">
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default VerificationEmptyState;
