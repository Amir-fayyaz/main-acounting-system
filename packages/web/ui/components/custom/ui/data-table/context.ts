import * as React from 'react';

import type { FilterValue } from './filters/filter-types';

export interface DataTableContextValue {
  /** Used by click-to-filter cells (e.g. click a date → show only that day). */
  setColumnFilter: (columnId: string, value: FilterValue | undefined) => void;
}

export const DataTableContext = React.createContext<DataTableContextValue | null>(null);

/** Returns null outside a DataTable, so cell components stay usable standalone. */
export function useDataTableContext(): DataTableContextValue | null {
  return React.useContext(DataTableContext);
}
