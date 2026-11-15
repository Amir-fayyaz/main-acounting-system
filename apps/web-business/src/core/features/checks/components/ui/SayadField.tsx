'use client';

import type { ComponentProps } from 'react';

import { Input, Muted } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

import { toAsciiDigits, toPersianDigits } from '../../utils/format';

interface SayadFieldProps extends Omit<
  ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type' | 'maxLength'
> {
  value: string;
  onValueChange: (value: string) => void;
  /** طول مجاز شناسه از قواعد API می‌آید. */
  expectedLength: number;
}

/**
 * فیلد شناسه صیادی: فقط ارقام، طول کنترل‌شده و شمارنده‌ی ارقام.
 * قانون نهایی یکتایی/اعتبار در API اعمال می‌شود.
 */
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
          شناسه صیادی باید {toPersianDigits(expectedLength)} رقم باشد.
        </Muted>
        <Muted className="text-xs tabular-nums" aria-live="polite">
          {toPersianDigits(digitCount)} / {toPersianDigits(expectedLength)}
        </Muted>
      </div>
    </div>
  );
}
