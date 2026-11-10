'use client';

import * as React from 'react';
import { CalendarDays } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '../ui';
import { cx } from '../lib/text';
import { JalaliDatePicker } from './JalaliDatePicker';
import { formatJalali, maskJalaliTyping, parseJalaliInput, type IsoDate } from './jalali';

export interface JalaliDateInputProps {
  /** Gregorian ISO (`YYYY-MM-DD`) — this is what you store and send to the API. */
  value: IsoDate | null | undefined;
  onChange: (value: IsoDate | null) => void;
  placeholder?: string;
  min?: IsoDate;
  max?: IsoDate;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
  onEnter?: () => void;
}

/**
 * Text field that the user types in Jalali (any digit system, auto "/" mask) plus a calendar popover.
 * `value` / `onChange` are Gregorian ISO strings. Invalid text never reaches `onChange`.
 */
export function JalaliDateInput({
  value,
  onChange,
  placeholder = '۱۴۰۵/۰۱/۰۱',
  min,
  max,
  disabled,
  invalid,
  autoFocus,
  id,
  className,
  onEnter,
  'aria-label': ariaLabel,
}: JalaliDateInputProps) {
  const [text, setText] = React.useState(() => formatJalali(value, { empty: '' }));
  const [bad, setBad] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const lastEmitted = React.useRef<IsoDate | null | undefined>(value);

  // Sync when the value changes from outside (picker, filter presets, reset).
  React.useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(formatJalali(value, { empty: '' }));
      setBad(false);
    }
  }, [value]);

  function emit(next: IsoDate | null) {
    lastEmitted.current = next;
    onChange(next);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskJalaliTyping(e.target.value);
    setText(masked);
    if (!masked) {
      setBad(false);
      emit(null);
      return;
    }
    if (masked.length === 10) {
      const iso = parseJalaliInput(masked);
      const outOfRange = iso && ((min && iso < min) || (max && iso > max));
      if (iso && !outOfRange) {
        setBad(false);
        emit(iso);
      } else {
        setBad(true);
      }
    } else {
      setBad(false);
    }
  }

  function handleBlur() {
    // Never leave half-typed / invalid text on screen: fall back to the last valid value.
    if (text && (bad || text.length < 10)) {
      setText(formatJalali(value, { empty: '' }));
      setBad(false);
    }
  }

  const isInvalid = invalid || bad;

  return (
    <div dir="rtl" className={cx('relative inline-flex w-full items-center', className)}>
      <input
        id={id}
        dir="rtl"
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={isInvalid || undefined}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        className={cx(
          'h-9 w-full rounded-lg border bg-background ps-3 pe-9 text-start text-sm tabular-nums outline-none transition-shadow',
          'placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
          isInvalid ? 'border-destructive focus-visible:ring-destructive' : 'border-border',
        )}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="انتخاب از تقویم"
            className="absolute inset-y-0 end-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <CalendarDays className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <JalaliDatePicker
            value={value}
            min={min}
            max={max}
            onChange={(iso) => {
              emit(iso);
              setText(formatJalali(iso, { empty: '' }));
              setBad(false);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
