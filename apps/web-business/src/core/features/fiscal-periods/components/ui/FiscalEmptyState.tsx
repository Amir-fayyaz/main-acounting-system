import type { ComponentType, ReactNode } from 'react';
import { Card, CardContent, H2, Muted } from '@repo/web/ui';

interface FiscalEmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function FiscalEmptyState({
  icon: Icon,
  title,
  description,
  actions,
}: FiscalEmptyStateProps) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col items-center gap-3 px-5 py-10 text-center sm:px-6">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-ink">
          <Icon className="size-6" />
        </span>
        <div className="space-y-1">
          <H2 className="pb-0 text-start text-base font-bold">{title}</H2>
          <Muted className="max-w-sm text-xs leading-6 sm:text-sm">{description}</Muted>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">{actions}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
