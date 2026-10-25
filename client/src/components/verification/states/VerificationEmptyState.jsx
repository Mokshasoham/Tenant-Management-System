import React from 'react';
import { ShieldAlert, Shield, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '../../PremiumUI';
import { useLanguage } from '../../../context/LanguageContext';

export const VerificationEmptyState = ({
  icon = 'ShieldAlert',
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  const { t } = useLanguage();

  const displayTitle = title || t('verification.noVerificationFound', 'No Verification Found');
  const displayDescription =
    description ||
    t(
      'verification.startVerificationPrompt',
      'Start your verification process to unlock platform features and build trust credentials.'
    );
  const displayActionText = actionText !== undefined ? actionText : t('verification.beginVerification', 'Begin Verification');

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
    <div
      className={`p-8 sm:p-12 text-center rounded-2xl border border-border bg-card/60 glass-card flex flex-col items-center justify-center space-y-4 ${className}`}
    >
      <div className="p-4 rounded-2xl bg-muted border border-border">{renderIcon()}</div>
      <h3 className="text-lg font-black text-foreground">{displayTitle}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{displayDescription}</p>
      {displayActionText && onAction && (
        <Button variant="primary" onClick={onAction} className="mt-2">
          {displayActionText}
        </Button>
      )}
    </div>
  );
};

export default VerificationEmptyState;
