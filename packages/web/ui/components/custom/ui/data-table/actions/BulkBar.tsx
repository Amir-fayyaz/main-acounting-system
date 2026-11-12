'use client';

import * as React from 'react';

import type { BulkAction } from '../data-table.types';
import { Button } from '../ui';
import { cx } from '../lib/text';

/** Appears while rows are selected. Actions receive exactly the selected rows of the current page. */
export function BulkBar<T>({
  count,
  rows,
  actions,
  onRun,
  onClear,
}: {
  count: number;
  rows: T[];
  actions: BulkAction<T>[];
  onRun: (action: BulkAction<T>) => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="عملیات گروهی"
      className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-accent px-3 py-2 text-sm"
    >
      <span className="font-semibold tabular-nums">
        {count.toLocaleString('fa-IR')} مورد انتخاب شد
      </span>
      <div className="ms-auto flex flex-wrap items-center gap-2">
        {actions.map((a) => (
          <Button
            key={a.id}
            type="button"
            size="sm"
            variant={a.variant === 'destructive' ? 'destructive' : 'outline'}
            disabled={a.disabled?.(rows)}
            onClick={() => onRun(a)}
            className={cx('gap-1.5')}
          >
            {a.icon}
            {a.label}
          </Button>
        ))}
        <Button type="button" size="sm" variant="ghost" onClick={onClear}>
          لغو انتخاب
        </Button>
      </div>
    </div>
  );
}
