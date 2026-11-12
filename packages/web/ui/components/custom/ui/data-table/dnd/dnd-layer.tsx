'use client';

/**
 * Drag & drop for rows and columns, built on @dnd-kit.
 *
 * This file is loaded with a dynamic import (see hooks/useDndModule.ts), so tables that
 * don't enable reordering never download @dnd-kit.
 *
 * One DndContext serves both rows and columns; items are namespaced ("row:<id>", "col:<id>")
 * and each kind has its own SortableContext (rows wrap <tbody>, columns wrap the header <tr>).
 * Keyboard dragging (Space → arrows → Space) and Persian screen-reader announcements are included.
 */

import * as React from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';

import { cx } from '../lib/text';

const ROW = 'row:';
const COL = 'col:';

type Activator = ReturnType<typeof useSortable>;
interface HandleCtx {
  attributes: Activator['attributes'];
  listeners: Activator['listeners'];
  setActivatorNodeRef: Activator['setActivatorNodeRef'];
  isDragging: boolean;
}
const RowHandleContext = React.createContext<HandleCtx | null>(null);
const ColHandleContext = React.createContext<HandleCtx | null>(null);

const lockAxis: Modifier = ({ active, transform }) => {
  const type = active?.data.current?.type;
  return type === 'column' ? { ...transform, y: 0 } : { ...transform, x: 0 };
};

const css = (t: { x: number; y: number } | null) =>
  t ? `translate3d(${Math.round(t.x)}px, ${Math.round(t.y)}px, 0)` : undefined;

/* -------------------------------- root -------------------------------- */

export interface DndRootProps {
  rowIds: string[];
  columnIds: string[];
  /** Used for screen-reader announcements. */
  columnLabels: Record<string, string>;
  onRowsReorder?: (activeId: string, overId: string) => void;
  onColumnsReorder?: (activeId: string, overId: string) => void;
  children: React.ReactNode;
}

export function DndRoot({
  rowIds,
  columnIds,
  columnLabels,
  onRowsReorder,
  onColumnsReorder,
  children,
}: DndRootProps) {
  const sensors = useSensors(
    // A small distance keeps click-to-sort and click-to-select working on the same elements.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const describe = React.useCallback(
    (id: string | number) => {
      const s = String(id);
      if (s.startsWith(COL))
        return `ستون «${columnLabels[s.slice(COL.length)] ?? s.slice(COL.length)}»`;
      return `ردیف ${(rowIds.indexOf(s.slice(ROW.length)) + 1).toLocaleString('fa-IR')}`;
    },
    [columnLabels, rowIds],
  );

  function handleEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const a = String(active.id);
    const o = String(over.id);
    if (a.startsWith(ROW) && o.startsWith(ROW))
      onRowsReorder?.(a.slice(ROW.length), o.slice(ROW.length));
    else if (a.startsWith(COL) && o.startsWith(COL))
      onColumnsReorder?.(a.slice(COL.length), o.slice(COL.length));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[lockAxis]}
      onDragEnd={handleEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            'برای جابجایی، کلید فاصله را بزنید، با کلیدهای جهت‌نما حرکت دهید و دوباره فاصله را بزنید. برای لغو، Escape را بزنید.',
        },
        announcements: {
          onDragStart: ({ active }) => `${describe(active.id)} برداشته شد.`,
          onDragOver: ({ active, over }) =>
            over ? `${describe(active.id)} روی ${describe(over.id)} قرار گرفت.` : undefined,
          onDragEnd: ({ active, over }) =>
            over
              ? `${describe(active.id)} به جای ${describe(over.id)} منتقل شد.`
              : `${describe(active.id)} سر جای خود رها شد.`,
          onDragCancel: ({ active }) => `جابجایی ${describe(active.id)} لغو شد.`,
        },
      }}
    >
      {children}
    </DndContext>
  );
}

/** Wrap the <tbody> rows. */
export function RowsContext({ ids, children }: { ids: string[]; children: React.ReactNode }) {
  const items = React.useMemo(() => ids.map((id) => ROW + id), [ids]);
  return (
    <SortableContext items={items} strategy={verticalListSortingStrategy}>
      {children}
    </SortableContext>
  );
}

/** Wrap the header <tr> cells. */
export function ColumnsContext({ ids, children }: { ids: string[]; children: React.ReactNode }) {
  const items = React.useMemo(() => ids.map((id) => COL + id), [ids]);
  return (
    <SortableContext items={items} strategy={horizontalListSortingStrategy}>
      {children}
    </SortableContext>
  );
}

/* --------------------------------- rows --------------------------------- */

export const SortableRow = React.forwardRef<
  HTMLTableRowElement,
  React.ComponentPropsWithoutRef<'tr'> & { rowId: string; dragDisabled?: boolean }
>(function SortableRow({ rowId, dragDisabled, className, style, children, ...rest }, forwardedRef) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ROW + rowId,
    data: { type: 'row' },
    disabled: dragDisabled,
  });
  const handle = React.useMemo<HandleCtx>(
    () => ({ attributes, listeners, setActivatorNodeRef, isDragging }),
    [attributes, listeners, setActivatorNodeRef, isDragging],
  );
  const ref = React.useCallback(
    (node: HTMLTableRowElement | null) => {
      setNodeRef(node);
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [setNodeRef, forwardedRef],
  );

  return (
    <RowHandleContext.Provider value={handle}>
      <tr
        {...rest}
        ref={ref}
        style={{
          ...style,
          transform: css(transform),
          transition,
          position: isDragging ? 'relative' : style?.position,
        }}
        className={cx(className, isDragging && 'z-30 bg-accent shadow-lg ring-1 ring-primary/40')}
      >
        {children}
      </tr>
    </RowHandleContext.Provider>
  );
});

/** Grip button; must be rendered inside <SortableRow>. */
export function RowHandle({ label, disabled }: { label: string; disabled?: boolean }) {
  const ctx = React.useContext(RowHandleContext);
  if (!ctx) return null;
  return (
    <button
      type="button"
      ref={ctx.setActivatorNodeRef}
      disabled={disabled}
      aria-label={label}
      {...ctx.attributes}
      {...ctx.listeners}
      className={cx(
        'inline-flex size-7 touch-none items-center justify-center rounded-md text-muted-foreground transition-colors',
        'hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30',
        ctx.isDragging ? 'cursor-grabbing' : 'cursor-grab',
      )}
    >
      <GripVertical className="size-4" />
    </button>
  );
}

/* -------------------------------- columns -------------------------------- */

export const SortableTh = React.forwardRef<
  HTMLTableCellElement,
  React.ComponentPropsWithoutRef<'th'> & { columnId: string; dragDisabled?: boolean }
>(function SortableTh(
  { columnId, dragDisabled, className, style, children, ...rest },
  forwardedRef,
) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: COL + columnId,
    data: { type: 'column' },
    disabled: dragDisabled,
  });
  const handle = React.useMemo<HandleCtx>(
    () => ({ attributes, listeners, setActivatorNodeRef, isDragging }),
    [attributes, listeners, setActivatorNodeRef, isDragging],
  );
  const ref = React.useCallback(
    (node: HTMLTableCellElement | null) => {
      setNodeRef(node);
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [setNodeRef, forwardedRef],
  );

  return (
    <ColHandleContext.Provider value={handle}>
      <th
        {...rest}
        ref={ref}
        style={{
          ...style,
          transform: css(transform),
          transition,
          position: isDragging ? 'relative' : style?.position,
        }}
        className={cx(className, isDragging && 'z-30 bg-accent shadow-md')}
      >
        {children}
      </th>
    </ColHandleContext.Provider>
  );
});

/** Grip button for a column header; must be rendered inside <SortableTh>. */
export function ColumnHandle({ label }: { label: string }) {
  const ctx = React.useContext(ColHandleContext);
  if (!ctx) return null;
  return (
    <button
      type="button"
      ref={ctx.setActivatorNodeRef}
      aria-label={label}
      {...ctx.attributes}
      {...ctx.listeners}
      className={cx(
        'inline-flex size-5 touch-none items-center justify-center rounded text-muted-foreground/60 opacity-0 transition-opacity',
        'hover:text-foreground focus-visible:opacity-100 group-hover/th:opacity-100',
        ctx.isDragging ? 'cursor-grabbing opacity-100' : 'cursor-grab',
      )}
    >
      <GripVertical className="size-3.5" />
    </button>
  );
}

/** Re-export so DataTable can compute the new order without importing @dnd-kit itself. */
export { arrayMove };
