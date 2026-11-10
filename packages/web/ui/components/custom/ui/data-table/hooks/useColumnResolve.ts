import * as React from 'react';

import {
  buildTanstackColumns,
  resolveColumns,
  type ResolvedColumn,
} from '../columns/resolve-columns';
import type { DataTableColumn } from '../data-table.types';

export interface ResolvedColumns<T> {
  resolved: ResolvedColumn<T>[];
  byId: Record<string, ResolvedColumn<T>>;
  tsColumns: ReturnType<typeof buildTanstackColumns<T>>;
  initialVisibility: Record<string, boolean>;
  columnLabels: Record<string, string>;
}

/**
 * Turns the public column contract into everything the table needs:
 * resolved metadata, an id lookup, TanStack defs and initial view state.
 */
export function useColumnResolve<T>(columns: DataTableColumn<T>[]): ResolvedColumns<T> {
  const resolved = React.useMemo(() => resolveColumns(columns), [columns]);

  const byId = React.useMemo(
    () => Object.fromEntries(resolved.map((rc) => [rc.id, rc])),
    [resolved],
  );

  const tsColumns = React.useMemo(() => buildTanstackColumns(resolved), [resolved]);

  const initialVisibility = React.useMemo(
    () =>
      Object.fromEntries(
        resolved.filter((rc) => rc.def.defaultHidden).map((rc) => [rc.id, false]),
      ) as Record<string, boolean>,
    [resolved],
  );

  const columnLabels = React.useMemo(
    () => Object.fromEntries(resolved.map((rc) => [rc.id, rc.label])),
    [resolved],
  );

  return { resolved, byId, tsColumns, initialVisibility, columnLabels };
}
