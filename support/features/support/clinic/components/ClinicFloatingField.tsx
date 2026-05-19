import type { ReactNode } from 'react';

type ClinicFloatingFieldProps = {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
};

export function ClinicFloatingField({ label, children, hint, className }: ClinicFloatingFieldProps) {
  return (
    <label className={`floating-field clinic-floating-field${className ? ` ${className}` : ''}`}>
      <div className="floating-field__control">
        {children}
        <span>{label}</span>
      </div>
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}
