import React, { memo } from 'react';

/**
 * Reusable SettingsCard Primitive for enterprise setting modules.
 */
export const SettingsCard = memo(({ 
  title, 
  subtitle, 
  icon: Icon, 
  iconColor = 'text-primary',
  badge,
  children,
  className = '',
  loading = false,
  error = null,
  onRetry = null,
  empty = false,
  emptyMessage = 'No data available'
}) => {
  return (
    <div className={`p-6 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all ${className}`}>
      {(title || Icon) && (
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2.5 rounded-xl bg-muted border border-border/60 flex items-center justify-center">
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
            )}
            <div>
              {title && <h2 className="text-base font-black text-foreground">{title}</h2>}
              {subtitle && <p className="text-xs text-muted-foreground font-medium">{subtitle}</p>}
            </div>
          </div>
          {badge && <div>{badge}</div>}
        </div>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse py-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-10 bg-muted rounded w-full"></div>
          <div className="h-10 bg-muted rounded w-full"></div>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm flex items-center justify-between">
          <span>{error}</span>
          {onRetry && (
            <button 
              type="button" 
              onClick={onRetry}
              className="px-3 py-1 text-xs font-bold bg-rose-500 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Retry
            </button>
          )}
        </div>
      ) : empty ? (
        <div className="p-8 text-center text-muted-foreground text-sm font-medium">
          {emptyMessage}
        </div>
      ) : (
        children
      )}
    </div>
  );
});

SettingsCard.displayName = 'SettingsCard';
export default SettingsCard;
