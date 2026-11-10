import type * as React from 'react';

import type { DataTableProps, ToolbarOptions } from '../data-table.types';
import { useClientTablePipeline } from './useClientTablePipeline';
import { useColumnPersistence } from './useColumnPersistence';
import { useColumnResolve } from './useColumnResolve';

const EMPTY: never[] = [];
const DEFAULT_TOOLBAR: Required<ToolbarOptions> = {
  search: true,
  columns: true,
  density: true,
  export: true,
};
const defaultRowKey = (_row: unknown, index: number): React.Key => index;

/**
 * Data-source + column + view-state wiring: resolves columns, keeps
 * visibility/order/density, and runs the server/client TanStack pipeline.
 */
export function useDataTableModel<T>(props: DataTableProps<T>) {
  const meta = props.meta;
  const paginate = props.paginate ?? true;
  const source = props.data ?? props.rows ?? (EMPTY as T[]);
  const isServer = (props.mode ?? (meta ? 'server' : 'client')) === 'server';
  const toolbar: Required<ToolbarOptions> | null =
    props.toolbar === false
      ? null
      : {
          ...DEFAULT_TOOLBAR,
          ...(props.toolbar === true || props.toolbar === undefined ? {} : props.toolbar),
        };

  const { resolved, byId, tsColumns, initialVisibility, columnLabels } = useColumnResolve(
    props.columns,
  );

  const { visibility, setVisibility, columnOrder, setColumnOrder, density, setDensity } =
    useColumnPersistence({
      persistKey: props.persistKey,
      initialVisibility,
      byId,
      columnVisibility: props.columnVisibility,
      onColumnVisibilityChange: props.onColumnVisibilityChange,
      columnOrder: props.columnOrder,
      onColumnOrderChange: props.onColumnOrderChange,
      density: props.density,
      onDensityChange: props.onDensityChange,
    });

  const pipeline = useClientTablePipeline<T>({
    source,
    isServer,
    paginate,
    defaultPageSize: props.defaultPageSize ?? 20,
    rowKey: props.rowKey ?? defaultRowKey,
    resolved,
    tsColumns,
    byId,
    visibility,
    columnOrder,
    meta,
    sorting: props.sorting,
    onSortingChange: props.onSortingChange,
    columnFilters: props.columnFilters,
    onColumnFiltersChange: props.onColumnFiltersChange,
    search: props.search,
    onSearchChange: props.onSearchChange,
    page: props.page,
    onPageChange: props.onPageChange,
    limit: props.limit,
    onLimitChange: props.onLimitChange,
  });

  return {
    meta,
    paginate,
    isServer,
    toolbar,
    resolved,
    byId,
    columnLabels,
    initialVisibility,
    visibility,
    setVisibility,
    columnOrder,
    setColumnOrder,
    density,
    setDensity,
    ...pipeline,
  };
}
