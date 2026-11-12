'use client';

import * as React from 'react';

import { useDataTableContext } from '../context';
import { formatJalali, type JalaliFormat } from '../date/jalali';
import type { StatusMap } from '../data-table.types';
import { formatMoney, formatNumber } from '../lib/format';
import { cx } from '../lib/text';
import { toneClass } from '../lib/styles';

/** Date value (Gregorian ISO) shown in Jalali. Click → filters the table to that exact day. */
export function DateCell({
  value,
  columnId,
  format = 'numeric',
  clickable = true,
}: {
  value: unknown;
  columnId: string;
  format?: JalaliFormat;
  clickable?: boolean;
}) {
  const ctx = useDataTableContext();
  const iso = typeof value === 'string' && value ? value.slice(0, 10) : null;
  if (!iso) return <span className="text-muted-foreground">—</span>;

  const text = (
    <span dir="ltr" className="inline-block tabular-nums">
      {formatJalali(iso, { format })}
    </span>
  );
  if (!clickable || !ctx) return <time dateTime={iso}>{text}</time>;

  return (
    <button
      type="button"
      title={`${iso} — نمایش ردیف‌های همین تاریخ`}
      onClick={(e) => {
        e.stopPropagation();
        ctx.setColumnFilter(columnId, { from: iso, to: iso });
      }}
      className="-mx-1.5 rounded-md px-1.5 py-0.5 underline-offset-4 transition-colors hover:bg-accent hover:text-accent-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      <time dateTime={iso}>{text}</time>
    </button>
  );
}

/** Colored status pill. Click → filters the table by this status. */
export function StatusCell({
  value,
  columnId,
  map,
  clickable = true,
}: {
  value: unknown;
  columnId: string;
  map?: StatusMap;
  clickable?: boolean;
}) {
  const ctx = useDataTableContext();
  const key = String(value ?? '');
  if (!key) return <span className="text-muted-foreground">—</span>;
  const item = map?.[key];
  const pill = cx(
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
    toneClass[item?.tone ?? 'neutral'],
  );
  const label = item?.label ?? key;

  if (!clickable || !ctx) return <span className={pill}>{label}</span>;
  return (
    <button
      type="button"
      title="نمایش ردیف‌هایی با همین وضعیت"
      onClick={(e) => {
        e.stopPropagation();
        ctx.setColumnFilter(columnId, [key]);
      }}
      className={cx(
        pill,
        'transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {label}
    </button>
  );
}

export function MoneyCell({ value, currency }: { value: unknown; currency?: string }) {
  if (value === null || value === undefined || value === '')
    return <span className="text-muted-foreground">—</span>;
  const n = Number(value);
  return (
    <span dir="ltr" className={cx('inline-block tabular-nums', n < 0 && 'text-destructive')}>
      {formatMoney(n)}
      {currency ? <span className="ms-1 text-xs text-muted-foreground">{currency}</span> : null}
    </span>
  );
}

export function NumberCell({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '')
    return <span className="text-muted-foreground">—</span>;
  return (
    <span dir="ltr" className="inline-block tabular-nums">
      {formatNumber(Number(value))}
    </span>
  );
}
