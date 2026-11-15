'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cx } from '../lib/text';
import {
  JALALI_MONTHS,
  JALALI_WEEKDAYS_SHORT,
  isoToJalali,
  jalaliMonthLength,
  jalaliToIso,
  jalaliWeekday,
  todayIso,
  toFaDigits,
  type IsoDate,
} from './jalali';

export interface JalaliDatePickerProps {
  /** Gregorian ISO value. */
  value: IsoDate | null | undefined;
  onChange: (value: IsoDate | null) => void;
  min?: IsoDate;
  max?: IsoDate;
  className?: string;
  /** Hide the "clear" button (for required fields). */
  clearable?: boolean;
}

const cell =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-30';

/**
 * Month-grid calendar. Shows Jalali, emits Gregorian ISO.
 * Saturday-first week, month/year dropdowns, "today" shortcut. No dependencies.
 */
export function JalaliDatePicker({
  value,
  onChange,
  min,
  max,
  className,
  clearable = true,
}: JalaliDatePickerProps) {
  const today = React.useMemo(() => todayIso(), []);
  const initial = isoToJalali(value) ?? isoToJalali(today)!;
  const [view, setView] = React.useState({ jy: initial.jy, jm: initial.jm });

  // Follow external value changes (e.g. typing in the input).
  React.useEffect(() => {
    const j = isoToJalali(value);
    if (j) setView({ jy: j.jy, jm: j.jm });
  }, [value]);

  const monthStart = jalaliToIso(view.jy, view.jm, 1)!;
  const offset = jalaliWeekday(monthStart);
  const length = jalaliMonthLength(view.jy, view.jm);
  const nowJ = isoToJalali(today)!;
  const years = React.useMemo(() => {
    const from = nowJ.jy - 80;
    return Array.from({ length: 100 }, (_, i) => from + i);
  }, [nowJ.jy]);

  function shift(delta: number) {
    setView(({ jy, jm }) => {
      const total = jy * 12 + (jm - 1) + delta;
      return { jy: Math.floor(total / 12), jm: (total % 12) + 1 };
    });
  }

  const days: Array<{ iso: IsoDate; day: number } | null> = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: length }, (_, i) => ({
      iso: jalaliToIso(view.jy, view.jm, i + 1)!,
      day: i + 1,
    })),
  ];

  return (
    <div dir="rtl" className={cx('w-[280px] select-none p-3', className)}>
      <div className="mb-2 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="ماه قبل"
          className={cx(cell, 'hover:bg-muted')}
        >
          <ChevronRight className="size-4" />
        </button>
        <div className="flex items-center gap-1">
          <select
            aria-label="ماه"
            value={view.jm}
            onChange={(e) => setView((v) => ({ ...v, jm: Number(e.target.value) }))}
            className="h-8 rounded-md border border-border bg-background px-1.5 text-sm font-medium"
          >
            {JALALI_MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            aria-label="سال"
            value={view.jy}
            onChange={(e) => setView((v) => ({ ...v, jy: Number(e.target.value) }))}
            className="h-8 rounded-md border border-border bg-background px-1.5 text-sm font-medium tabular-nums"
          >
            {(years.includes(view.jy) ? years : [view.jy, ...years]).map((y) => (
              <option key={y} value={y}>
                {toFaDigits(y)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="ماه بعد"
          className={cx(cell, 'hover:bg-muted')}
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>

      <div
        className="grid grid-cols-7 gap-y-0.5 text-center"
        role="grid"
        aria-label={`${JALALI_MONTHS[view.jm - 1]} ${toFaDigits(view.jy)}`}
      >
        {JALALI_WEEKDAYS_SHORT.map((w, i) => (
          <div
            key={w}
            className={cx(
              'py-1 text-xs font-medium text-muted-foreground',
              i === 6 && 'text-destructive',
            )}
          >
            {w}
          </div>
        ))}
        {days.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const selected = d.iso === value;
          const disabled = Boolean((min && d.iso < min) || (max && d.iso > max));
          return (
            <button
              key={d.iso}
              type="button"
              role="gridcell"
              disabled={disabled}
              aria-selected={selected}
              aria-current={d.iso === today ? 'date' : undefined}
              aria-label={`${toFaDigits(d.day)} ${JALALI_MONTHS[view.jm - 1]} ${toFaDigits(view.jy)}`}
              onClick={() => onChange(d.iso)}
              className={cx(
                cell,
                'mx-auto',
                selected
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : d.iso === today
                    ? 'border border-primary/60 font-semibold hover:bg-accent'
                    : 'hover:bg-accent',
                !selected && i % 7 === 6 && 'text-destructive',
              )}
            >
              {toFaDigits(d.day)}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
        <button
          type="button"
          onClick={() => onChange(today)}
          disabled={Boolean((min && today < min) || (max && today > max))}
          className="rounded-md px-2 py-1 font-medium text-[color:var(--brand-link,hsl(var(--primary)))] hover:bg-accent disabled:opacity-40"
        >
          امروز
        </button>
        {clearable && value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted"
          >
            پاک کردن
          </button>
        ) : null}
      </div>
    </div>
  );
}
