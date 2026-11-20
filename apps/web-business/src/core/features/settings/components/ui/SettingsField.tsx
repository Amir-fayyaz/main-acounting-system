'use client';

import type { ReactNode } from 'react';

import { InputErrorMassage, Small } from '@repo/web';
import { cn } from '@repo/web/ui/utils/cn';

export type SettingsFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

export function SettingsField({ id, label, error, hint, children, className }: SettingsFieldProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Small className="font-medium">{label}</Small>
      {children}
      {hint && !error ? (
        <Small className="text-xs font-normal text-muted-foreground">{hint}</Small>
      ) : null}
      {error ? (
        <InputErrorMassage id={`${id}-error`} role="alert">
          {error}
        </InputErrorMassage>
      ) : null}
    </div>
  );
}
