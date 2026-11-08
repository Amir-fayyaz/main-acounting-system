import type { ReactNode } from 'react';

import { SectionLayout } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

import { ListToolbar, type ListToolbarProps } from './ListToolbar';
import { PageHeader } from './PageHeader';
import { StatsRow, type ListStatsState } from './StatsRow';

export type ListPageProps = {
  title: string;
  description?: string;
  /** Trailing header controls (print, add-record, …). */
  actions?: ReactNode;
  /** Optional statistics row rendered above the toolbar. */
  stats?: ListStatsState;
  /** Search/filter slot rendered as the list toolbar. */
  toolbar?: Omit<ListToolbarProps, 'className'>;
  /** The list body — typically a `DataTable`. */
  children: ReactNode;
  className?: string;
};

/**
 * Shared structure for panel list pages (prototype `R.table` shell):
 * page header → optional stats row → toolbar → table body.
 */
export function ListPage({
  title,
  description,
  actions,
  stats,
  toolbar,
  children,
  className,
}: ListPageProps) {
  return (
    <SectionLayout className={cn(className)}>
      <PageHeader title={title} description={description} actions={actions} />
      <div className="grid gap-4">
        {stats ? <StatsRow stats={stats} /> : null}
        {toolbar ? <ListToolbar {...toolbar} /> : null}
        {children}
      </div>
    </SectionLayout>
  );
}
