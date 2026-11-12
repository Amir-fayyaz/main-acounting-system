import * as React from 'react';

export type DndModule = typeof import('../dnd/dnd-layer');

let cached: DndModule | null = null;
let pending: Promise<DndModule> | null = null;

/**
 * Loads the drag-and-drop chunk (@dnd-kit) only when a table actually enables
 * row/column reordering. Tables without DnD never download it.
 */
export function useDndModule(enabled: boolean): DndModule | null {
  const [mod, setMod] = React.useState<DndModule | null>(cached);

  React.useEffect(() => {
    if (!enabled || mod) return;
    let alive = true;
    pending ??= import('../dnd/dnd-layer');
    pending.then((m) => {
      cached = m;
      if (alive) setMod(m);
    });
    return () => {
      alive = false;
    };
  }, [enabled, mod]);

  return enabled ? mod : null;
}
