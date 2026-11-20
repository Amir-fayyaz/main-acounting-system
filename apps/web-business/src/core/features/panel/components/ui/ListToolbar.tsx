import type { ReactNode } from 'react';

import { cn } from '@repo/web/ui/utils/cn';

export type ListToolbarProps = {
  /** Slot for the URL-synced search input (grows up to the prototype 320px). */
  search?: ReactNode;
  /** Slot for the status filter control. */
  filter?: ReactNode;
  /** Extra toolbar controls (row actions, view toggles). */
  children?: ReactNode;
  className?: string;
};

/** Prototype `toolbar`: search + filter + actions above a list table. */
export function ListToolbar({ search, filter, children, className }: ListToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      {search ? <div className="min-w-[200px] max-w-xs flex-1">{search}</div> : null}
      {filter}
      {children}
    </div>
  );
}
