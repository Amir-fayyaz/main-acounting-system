import type { ReactNode } from 'react';
import { InputErrorMassage, Muted } from '@repo/web/ui';

interface FiscalFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}

export function FiscalField({ id, label, hint, error, children }: FiscalFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <InputErrorMassage>{error}</InputErrorMassage>
      ) : hint ? (
        <Muted className="text-[11px]">{hint}</Muted>
      ) : null}
    </div>
  );
}
