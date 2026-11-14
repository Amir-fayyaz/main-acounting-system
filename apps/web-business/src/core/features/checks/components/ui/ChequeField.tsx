import { cloneElement, isValidElement, type ReactNode } from 'react';

import { InputErrorMassage, Muted } from '@repo/web/ui';

interface ChequeFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}

/** فیلد فرم چک: برچسب، کنترل و خطا/راهنمای همان فیلد با اتصال دسترس‌پذیر. */
export function ChequeField({ id, label, hint, error, children }: ChequeFieldProps) {
  const messageId = `${id}-message`;
  const hasMessage = Boolean(error || hint);
  const control =
    hasMessage && isValidElement<{ 'aria-describedby'?: string }>(children)
      ? cloneElement(children, { 'aria-describedby': messageId })
      : children;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {control}
      {error ? (
        <InputErrorMassage id={messageId}>{error}</InputErrorMassage>
      ) : hint ? (
        <Muted id={messageId} className="text-xs">
          {hint}
        </Muted>
      ) : null}
    </div>
  );
}
