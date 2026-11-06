import type { ReactNode } from 'react';

import { H1, P } from '@repo/web/ui';

export type PageHeaderProps = {
  title: string;
  description?: string;
  /** Trailing header controls (primary/secondary actions). */
  actions?: ReactNode;
};

/** Prototype `page-head`: title + description leading, actions trailing. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        <H1 className="text-start text-xl font-bold sm:text-2xl">{title}</H1>
        {description ? <P className="text-sm text-muted-foreground">{description}</P> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
