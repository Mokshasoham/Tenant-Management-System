import React, { memo } from 'react';

export const FormSection = memo(({ title, description, children, className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {(title || description) && (
      <div className="space-y-0.5">
        {title && <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">{title}</h3>}
        {description && <p className="text-xs text-muted-foreground/80">{description}</p>}
      </div>
    )}
    {children}
  </div>
));

FormSection.displayName = 'FormSection';
export default FormSection;
