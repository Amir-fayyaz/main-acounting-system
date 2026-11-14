'use client';

import * as React from 'react';
import { Filter } from 'lucide-react';

import type { ResolvedColumn } from '../columns/resolve-columns';
import { DATE_PRESETS, formatRangeLabel, todayIso, type IsoRange } from '../date/jalali';
import { JalaliDateInput } from '../date/JalaliDateInput';
import { Button, Popover, PopoverContent, PopoverTrigger } from '../ui';
import { formatMoney, maskMoneyTyping, parseNumberInput } from '../lib/format';
import { cx } from '../lib/text';
import { fieldClass, iconBtnClass } from '../lib/styles';
import { isFilterActive, type FilterValue, type NumberRange } from './filter-types';

export interface ColumnFilterProps<T> {
  column: ResolvedColumn<T>;
  value: FilterValue | undefined;
  onChange: (value: FilterValue | undefined) => void;
}

/** Funnel icon in the header; opens a popover whose content depends on the filter type. */
export function ColumnFilterButton<T>({ column, value, onChange }: ColumnFilterProps<T>) {
  const [open, setOpen] = React.useState(false);
  const active = isFilterActive(value);
  const filter = column.filter!;
  const apply = (next: FilterValue | undefined, close = true) => {
    onChange(next !== undefined && isFilterActive(next) ? next : undefined);
    if (close) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`فیلتر ${column.label}`}
          aria-pressed={active}
          className={cx(
            iconBtnClass,
            'size-6',
            active && 'bg-accent text-[color:var(--brand-link,hsl(var(--primary)))]',
          )}
        >
          <Filter className={cx('size-3.5', active && 'fill-current')} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" dir="rtl" className="w-72 p-3">
        <p className="mb-2 text-sm font-semibold">{filter.label ?? column.label}</p>
        {filter.type === 'text' && (
          <TextFilter
            value={value as string | undefined}
            placeholder={filter.placeholder}
            onApply={apply}
          />
        )}
        {filter.type === 'select' && (
          <SelectFilter
            options={filter.options ?? []}
            value={value as string | undefined}
            onApply={apply}
          />
        )}
        {filter.type === 'multiselect' && (
          <MultiSelectFilter
            options={filter.options ?? []}
            value={(value as string[] | undefined) ?? []}
            onApply={(v) => apply(v, false)}
            onClear={() => apply(undefined)}
          />
        )}
        {filter.type === 'date' && (
          <DateFilter value={value as IsoRange | undefined} onApply={apply} />
        )}
        {filter.type === 'number' && (
          <NumberFilter value={value as NumberRange | undefined} onApply={apply} />
        )}
      </PopoverContent>
    </Popover>
  );
}

function Footer({
  onClear,
  canClear,
  children,
}: {
  onClear: () => void;
  canClear: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      {children}
      <Button type="button" variant="ghost" size="sm" disabled={!canClear} onClick={onClear}>
        پاک کردن
      </Button>
    </div>
  );
}

function TextFilter({
  value,
  placeholder,
  onApply,
}: {
  value?: string;
  placeholder?: string;
  onApply: (v: FilterValue | undefined) => void;
}) {
  const [text, setText] = React.useState(value ?? '');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply(text.trim() || undefined);
      }}
    >
      <input
        autoFocus
        className={fieldClass}
        value={text}
        placeholder={placeholder ?? 'شامل…'}
        onChange={(e) => setText(e.target.value)}
      />
      <Footer canClear={Boolean(value || text)} onClear={() => onApply(undefined)}>
        <Button type="submit" size="sm">
          اعمال
        </Button>
      </Footer>
    </form>
  );
}

function SelectFilter({
  options,
  value,
  onApply,
}: {
  options: Array<{ value: string; label: string }>;
  value?: string;
  onApply: (v: FilterValue | undefined) => void;
}) {
  return (
    <div role="listbox" className="max-h-60 overflow-auto">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="option"
          aria-selected={o.value === value}
          onClick={() => onApply(o.value === value ? undefined : o.value)}
          className={cx(
            'flex w-full items-center rounded-md px-2 py-1.5 text-start text-sm hover:bg-accent',
            o.value === value && 'bg-accent font-semibold',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MultiSelectFilter({
  options,
  value,
  onApply,
  onClear,
}: {
  options: Array<{ value: string; label: string }>;
  value: string[];
  onApply: (v: string[]) => void;
  onClear: () => void;
}) {
  const [selected, setSelected] = React.useState(value);
  const toggle = (v: string) => {
    const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
    setSelected(next);
    onApply(next);
  };
  return (
    <>
      <div className="max-h-60 overflow-auto">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
          >
            <input
              type="checkbox"
              className="size-4 accent-[var(--primary,currentColor)]"
              checked={selected.includes(o.value)}
              onChange={() => toggle(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
      <Footer canClear={selected.length > 0} onClear={onClear} />
    </>
  );
}

function DateFilter({
  value,
  onApply,
}: {
  value?: IsoRange;
  onApply: (v: FilterValue | undefined) => void;
}) {
  const [range, setRange] = React.useState<IsoRange>(value ?? {});
  const invalid = Boolean(range.from && range.to && range.from > range.to);
  const today = todayIso();
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onApply(p.range(today))}
            className="rounded-full border border-border px-2.5 py-0.5 text-xs hover:bg-accent"
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[2rem_1fr] items-center gap-x-2 gap-y-2 text-sm">
        <span className="text-muted-foreground">از</span>
        <JalaliDateInput
          aria-label="از تاریخ"
          value={range.from}
          max={range.to}
          onChange={(from) => setRange((r) => ({ ...r, from: from ?? undefined }))}
        />
        <span className="text-muted-foreground">تا</span>
        <JalaliDateInput
          aria-label="تا تاریخ"
          value={range.to}
          min={range.from}
          onChange={(to) => setRange((r) => ({ ...r, to: to ?? undefined }))}
        />
      </div>
      {invalid ? (
        <p className="mt-2 text-xs text-destructive">تاریخ پایان قبل از تاریخ شروع است.</p>
      ) : null}
      <Footer
        canClear={isFilterActive(value) || isFilterActive(range)}
        onClear={() => onApply(undefined)}
      >
        <Button
          type="button"
          size="sm"
          disabled={invalid || !isFilterActive(range)}
          onClick={() => onApply(range)}
        >
          اعمال
        </Button>
      </Footer>
    </div>
  );
}

function NumberFilter({
  value,
  onApply,
}: {
  value?: NumberRange;
  onApply: (v: FilterValue | undefined) => void;
}) {
  const [min, setMin] = React.useState(
    value?.min !== undefined ? maskMoneyTyping(String(value.min)) : '',
  );
  const [max, setMax] = React.useState(
    value?.max !== undefined ? maskMoneyTyping(String(value.max)) : '',
  );
  const range: NumberRange = {
    min: parseNumberInput(min) ?? undefined,
    max: parseNumberInput(max) ?? undefined,
  };
  const invalid = range.min !== undefined && range.max !== undefined && range.min > range.max;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!invalid) onApply(range);
      }}
    >
      <div className="grid grid-cols-[3rem_1fr] items-center gap-x-2 gap-y-2 text-sm">
        <span className="text-muted-foreground">حداقل</span>
        <input
          dir="ltr"
          inputMode="decimal"
          className={fieldClass}
          value={min}
          onChange={(e) => setMin(maskMoneyTyping(e.target.value))}
          aria-label="حداقل"
        />
        <span className="text-muted-foreground">حداکثر</span>
        <input
          dir="ltr"
          inputMode="decimal"
          className={fieldClass}
          value={max}
          onChange={(e) => setMax(maskMoneyTyping(e.target.value))}
          aria-label="حداکثر"
        />
      </div>
      {invalid ? (
        <p className="mt-2 text-xs text-destructive">حداقل بزرگ‌تر از حداکثر است.</p>
      ) : null}
      <Footer
        canClear={isFilterActive(value) || isFilterActive(range)}
        onClear={() => onApply(undefined)}
      >
        <Button type="submit" size="sm" disabled={invalid || !isFilterActive(range)}>
          اعمال
        </Button>
      </Footer>
    </form>
  );
}

/** Human-readable text of an active filter (used by the chips bar). */
export function describeFilter<T>(column: ResolvedColumn<T>, value: FilterValue): string {
  const f = column.filter;
  if (!f) return String(value);
  switch (f.type) {
    case 'date':
      return formatRangeLabel(value as IsoRange);
    case 'number': {
      const r = value as NumberRange;
      const a = r.min !== undefined ? formatMoney(r.min, { parentheses: false }) : null;
      const b = r.max !== undefined ? formatMoney(r.max, { parentheses: false }) : null;
      return a && b ? `${a} تا ${b}` : a ? `حداقل ${a}` : `حداکثر ${b}`;
    }
    case 'multiselect':
      return (value as string[])
        .map((v) => f.options?.find((o) => o.value === v)?.label ?? v)
        .join('، ');
    case 'select':
      return f.options?.find((o) => o.value === value)?.label ?? String(value);
    default:
      return `«${String(value)}»`;
  }
}
