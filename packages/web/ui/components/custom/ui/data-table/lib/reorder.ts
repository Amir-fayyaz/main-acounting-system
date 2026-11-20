/**
 * Moves the item with `activeId` to the position of `overId` in the FULL list.
 * Use inside `onRowReorder` when your data array is bigger than the visible page.
 */
export function reorderById<T>(
  list: T[],
  activeId: string,
  overId: string,
  getId: (item: T) => string,
): T[] {
  const from = list.findIndex((item) => getId(item) === activeId);
  const to = list.findIndex((item) => getId(item) === overId);
  if (from < 0 || to < 0 || from === to) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
