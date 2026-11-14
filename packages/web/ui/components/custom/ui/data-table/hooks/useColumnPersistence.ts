import * as React from 'react';

import type { Density } from '../data-table.types';
import { useControllableState } from './useControllableState';

const STORAGE_PREFIX = 'data-table:v1:';

export interface ColumnPersistenceOptions {
  persistKey?: string;
  initialVisibility: Record<string, boolean>;
  /** Column ids that still exist; stale stored ids are dropped. */
  byId: Record<string, unknown>;
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void;
  columnOrder?: string[];
  onColumnOrderChange?: (order: string[]) => void;
  density?: Density;
  onDensityChange?: (density: Density) => void;
}

/**
 * Column view preferences (visibility, order, density) with optional
 * per-user localStorage persistence. Controlled props still win.
 */
export function useColumnPersistence({
  persistKey,
  initialVisibility,
  byId,
  columnVisibility,
  onColumnVisibilityChange,
  columnOrder: controlledOrder,
  onColumnOrderChange,
  density: controlledDensity,
  onDensityChange,
}: ColumnPersistenceOptions) {
  const [visibility, setVisibility] = useControllableState<Record<string, boolean>>(
    columnVisibility,
    initialVisibility,
    onColumnVisibilityChange,
  );
  const [columnOrder, setColumnOrder] = useControllableState<string[]>(
    controlledOrder,
    [],
    onColumnOrderChange,
  );
  const [density, setDensity] = useControllableState<Density>(
    controlledDensity,
    'comfortable',
    onDensityChange,
  );

  const storageKey = persistKey ? STORAGE_PREFIX + persistKey : null;
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as {
          visibility?: Record<string, boolean>;
          order?: string[];
          density?: Density;
        };
        if (saved.visibility && typeof saved.visibility === 'object') {
          setVisibility(
            Object.fromEntries(
              Object.entries(saved.visibility).filter(
                ([id, v]) => id in byId && typeof v === 'boolean',
              ),
            ),
          );
        }
        if (Array.isArray(saved.order))
          setColumnOrder(saved.order.filter((id) => typeof id === 'string' && id in byId));
        if (saved.density === 'compact' || saved.density === 'comfortable')
          setDensity(saved.density);
      }
    } catch {
      /* corrupted or unavailable storage: ignore */
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  React.useEffect(() => {
    if (!storageKey || !hydrated) return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ visibility, order: columnOrder, density }),
      );
    } catch {
      /* quota / private mode */
    }
  }, [storageKey, hydrated, visibility, columnOrder, density]);

  return { visibility, setVisibility, columnOrder, setColumnOrder, density, setDensity };
}
