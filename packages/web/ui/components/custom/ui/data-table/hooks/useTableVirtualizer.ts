import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { Density } from '../data-table.types';

export interface TableVirtualizerOptions {
  virtualize: boolean;
  count: number;
  density: Density;
}

/** Scroll container + row virtualizer; disabled when `virtualize` is off. */
export function useTableVirtualizer({ virtualize, count, density }: TableVirtualizerOptions) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: virtualize ? count : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (density === 'compact' ? 37 : 53),
    overscan: 10,
    enabled: virtualize,
  });

  return { scrollRef, virtualizer };
}
