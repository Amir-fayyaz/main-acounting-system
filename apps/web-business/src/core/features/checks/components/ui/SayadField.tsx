'use client';

import type { ComponentProps } from 'react';
import { Input, Muted } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';
import { toAsciiDigits, toFaDigits } from '../../../shared';

interface SayadFieldProps extends Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type' | 'maxLength'
> {
  value: string;
  onValueChange: (value: string) => void;
  expectedLength: number;
}

export function SayadField({
  value,
  onValueChange,
  expectedLength,
  className,
  id,
  ...props
}: SayadFieldProps) {
  const digitCount = toAsciiDigits(value).replace(/\D/g, '').length;

  return (
    <div className="space-y-1.5">
      <Input
        {...props}
        id={id}
        dir="ltr"
        inputMode="numeric"
        autoComplete="off"
        maxLength={expectedLength}
        className={cn('text-start tabular-nums', className)}
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-1">
        <Muted className="text-xs">
          شناسه صیادی باید {toFaDigits(expectedLength)} رقم باشد.
        </Muted>
        <Muted className="text-xs tabular-nums" aria-live="polite">
          {toFaDigits(digitCount)} / {toFaDigits(expectedLength)}
        </Muted>
      </div>
    </div>
  );
}
