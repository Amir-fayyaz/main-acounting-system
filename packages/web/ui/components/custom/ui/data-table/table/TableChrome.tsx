'use client';

import * as React from 'react';

import { BulkBar } from '../actions/BulkBar';
import type { ResolvedColumn } from '../columns/resolve-columns';
import type { BulkAction, Density, ToolbarOptions } from '../data-table.types';
import { ActiveFilters } from '../filters/ActiveFilters';
import type { FilterValue } from '../filters/filter-types';
import { Toolbar } from '../Toolbar';

export interface TableChromeBulk<T> {
  count: number;
  rows: T[];
  actions: BulkAction<T>[];
  onRun: (action: BulkAction<T>) => void;
  onClear: () => void;
}

export interface TableChromeProps<T> {
  toolbar: Required<ToolbarOptions> | null;
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  columns: ResolvedColumn<T>[];
  visibility: Record<string, boolean>;
  onToggleColumn: (columnId: string, visible: boolean) => void;
  onResetColumns: () => void;
  density: Density;
  onDensity: (density: Density) => void;
  onExport?: () => void;
  toolbarStart?: React.ReactNode;
  toolbarEnd?: React.ReactNode;
  filters: Record<string, FilterValue>;
  onRemoveFilter: (columnId: string) => void;
  onClearFilters: () => void;
  bulk: TableChromeBulk<T> | null;
  notice: string | null;
  onDismissNotice: () => void;
}

/** Toolbar, active filters, bulk bar, and the non-blocking error notice. */
export function TableChrome<T>({
  toolbar,
  search,
  onSearch,
  searchPlaceholder,
  columns,
  visibility,
  onToggleColumn,
  onResetColumns,
  density,
  onDensity,
  onExport,
  toolbarStart,
  toolbarEnd,
  filters,
  onRemoveFilter,
  onClearFilters,
  bulk,
  notice,
  onDismissNotice,
}: TableChromeProps<T>) {
  return (
    <>
      {toolbar ? (
        <Toolbar<T>
          options={toolbar}
          search={search}
          onSearch={onSearch}
          searchPlaceholder={searchPlaceholder}
          columns={columns}
          visibility={visibility}
          onToggleColumn={onToggleColumn}
          onResetColumns={onResetColumns}
          density={density}
          onDensity={onDensity}
          onExport={onExport}
          start={toolbarStart}
          end={toolbarEnd}
        />
      ) : null}

      <ActiveFilters
        columns={columns}
        filters={filters}
        onRemove={onRemoveFilter}
        onClearAll={onClearFilters}
      />

      {bulk && bulk.actions.length ? (
        <BulkBar
          count={bulk.count}
          rows={bulk.rows}
          actions={bulk.actions}
          onRun={bulk.onRun}
          onClear={bulk.onClear}
        />
      ) : null}

      {notice ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={onDismissNotice}
            className="text-xs underline underline-offset-4"
          >
            بستن
          </button>
        </div>
      ) : null}
    </>
  );
}
