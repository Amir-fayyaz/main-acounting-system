'use client';

import * as React from 'react';
import { X } from 'lucide-react';

import type { ResolvedColumn } from '../columns/resolve-columns';
import { describeFilter } from './ColumnFilter';
import { isFilterActive, type FilterValue } from './filter-types';

/** Removable chips for every active column filter ("تاریخ: ۱۴۰۵/۰۷/۲۷ ×") + clear-all. */
export function ActiveFilters<T>({
  columns,
  filters,
  onRemove,
  onClearAll,
}: {
  columns: ResolvedColumn<T>[];
  filters: Record<string, FilterValue>;
  onRemove: (columnId: string) => void;
  onClearAll: () => void;
}) {
  const active = columns.filter((c) => c.filter && isFilterActive(filters[c.id]));
  if (!active.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="فیلترهای فعال">
      {active.map((c) => (
        <span
          key={c.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent/60 py-0.5 ps-3 pe-1 text-xs"
        >
          <span className="text-muted-foreground">{c.filter?.label ?? c.label}:</span>
          <span className="font-semibold">{describeFilter(c, filters[c.id])}</span>
          <button
            type="button"
            onClick={() => onRemove(c.id)}
            aria-label={`حذف فیلتر ${c.label}`}
            className="inline-flex size-5 items-center justify-center rounded-full hover:bg-background"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      {active.length > 1 ? (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          پاک کردن همه
        </button>
      ) : null}
    </div>
  );
}
