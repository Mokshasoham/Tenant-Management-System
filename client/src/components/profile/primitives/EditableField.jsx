import React, { memo } from 'react';

export const EditableField = memo(({
  label,
  type = 'text',
  value,
  onChange,
  disabled,
  placeholder,
  required,
  error,
  icon: Icon,
  rightEl,
  children
}) => (
  <div className="space-y-1.5">
    {label && (
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 flex items-center justify-between">
        <span>{label}{required && <span className="text-rose-500 ml-0.5">*</span>}</span>
        {error && <span className="text-rose-500 text-[10px] normal-case font-bold">{error}</span>}
      </label>
    )}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />}
      {children ? (
        children
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          className={`w-full ${Icon ? 'pl-10' : 'pl-4'} ${rightEl ? 'pr-10' : 'pr-4'} py-3 rounded-xl bg-muted/30 border ${error ? 'border-rose-500/80 focus:border-rose-500' : 'border-border focus:border-primary/60'} text-foreground text-sm placeholder-muted-foreground/30 focus:outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
        />
      )}
      {rightEl && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>}
    </div>
  </div>
));

EditableField.displayName = 'EditableField';
export default EditableField;
