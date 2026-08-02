import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';

export const ActionButton = memo(({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  icon: Icon,
  className = ''
}) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90 shadow-sm',
    secondary: 'bg-muted border border-border text-foreground hover:bg-muted/80',
    outline: 'border border-border text-foreground hover:bg-muted/40',
    danger: 'bg-rose-500 text-white hover:bg-rose-600',
    ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-3.5 h-3.5" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
});

ActionButton.displayName = 'ActionButton';
export default ActionButton;
