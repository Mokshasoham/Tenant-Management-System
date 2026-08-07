import React from 'react';
import { motion } from 'framer-motion';

export const VerificationPageHeader = ({
  title,
  subtitle,
  icon: Icon,
  breadcrumbs = [],
  actionSlot,
  className = '',
}) => {
  return (
    <div className={`mb-8 ${className}`}>
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-3">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-primary transition-colors">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
              {idx < breadcrumbs.length - 1 && <span>/</span>}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {Icon && (
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <Icon className="w-6 h-6" />
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground font-medium mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {actionSlot && <div className="flex items-center gap-3">{actionSlot}</div>}
      </div>
    </div>
  );
};

export default VerificationPageHeader;
