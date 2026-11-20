'use client';

import * as React from 'react';
import { AlignJustify, Download, Search, SlidersHorizontal, X } from 'lucide-react';

import type { ResolvedColumn } from './columns/resolve-columns';
import type { Density, ToolbarOptions } from './data-table.types';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { cx } from './lib/text';
import { fieldClass, iconBtnClass } from './lib/styles';
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui';

/** Debounced search field. Keeps its own text so typing never fights a URL round-trip. */
export function SearchBox({
  value,
  onSearch,
  placeholder,
  delay = 300,
}: {
  value: string;
  onSearch: (v: string) => void;
  placeholder?: string;
  delay?: number;
}) {
  const [text, setText] = React.useState(value);
  const lastEmitted = React.useRef(value);
  const emit = useDebouncedCallback((v: string) => {
    lastEmitted.current = v;
    onSearch(v);
  }, delay);

  React.useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(value); // changed from outside (back button, "clear all")
    }
  }, [value]);

  return (
    <div role="search" className="relative min-w-52 max-w-80 flex-1">
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={text}
        placeholder={placeholder ?? 'جستجو در جدول…'}
        aria-label="جستجو در جدول"
        onChange={(e) => {
          setText(e.target.value);
          emit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && text) {
            setText('');
            emit.cancel();
            lastEmitted.current = '';
            onSearch('');
          }
        }}
        className={cx(fieldClass, 'ps-9 [&::-webkit-search-cancel-button]:hidden')}
      />
      {text ? (
        <button
          type="button"
          aria-label="پاک کردن جستجو"
          onClick={() => {
            setText('');
            emit.cancel();
            lastEmitted.current = '';
            onSearch('');
          }}
          className="absolute end-1.5 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export interface ToolbarProps<T> {
  options: Required<ToolbarOptions>;
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
  columns: ResolvedColumn<T>[];
  visibility: Record<string, boolean>;
  onToggleColumn: (id: string, visible: boolean) => void;
  onResetColumns: () => void;
  density: Density;
  onDensity: (d: Density) => void;
  onExport?: () => void;
  start?: React.ReactNode;
  end?: React.ReactNode;
}

export function Toolbar<T>(p: ToolbarProps<T>) {
  const { options } = p;
  const hideable = p.columns.filter((c) => c.hideable);
  const anything =
    options.search ||
    options.columns ||
    options.density ||
    (options.export && p.onExport) ||
    p.start ||
    p.end;
  if (!anything) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.search ? (
        <SearchBox value={p.search} onSearch={p.onSearch} placeholder={p.searchPlaceholder} />
      ) : null}
      {p.start}
      <div className="ms-auto flex items-center gap-1">
        {p.end}
        {options.export && p.onExport ? (
          <button
            type="button"
            onClick={p.onExport}
            className={iconBtnClass}
            aria-label="خروجی CSV"
            title="خروجی CSV (تاریخ‌ها میلادی)"
          >
            <Download className="size-4" />
          </button>
        ) : null}
        {options.density ? (
          <button
            type="button"
            onClick={() => p.onDensity(p.density === 'compact' ? 'comfortable' : 'compact')}
            className={cx(iconBtnClass, p.density === 'compact' && 'bg-muted text-foreground')}
            aria-label="فشرده‌سازی ردیف‌ها"
            aria-pressed={p.density === 'compact'}
            title={p.density === 'compact' ? 'نمایش معمولی' : 'نمایش فشرده'}
          >
            <AlignJustify className="size-4" />
          </button>
        ) : null}
        {options.columns && hideable.length > 0 ? (
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={iconBtnClass}
                aria-label="ستون‌ها"
                title="نمایش ستون‌ها"
              >
                <SlidersHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-48">
              <DropdownMenuLabel>ستون‌های جدول</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hideable.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={p.visibility[c.id] !== false}
                  onCheckedChange={(v) => p.onToggleColumn(c.id, Boolean(v))}
                  onSelect={(e) => e.preventDefault()}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <div className="p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={p.onResetColumns}
                >
                  بازنشانی ستون‌ها
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}
