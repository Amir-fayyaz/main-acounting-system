import type { ReactNode } from 'react';

import { Card, CardContent } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

type AccountStatTone = 'default' | 'positive' | 'brand' | 'danger';

const TONE_CLASSES: Record<AccountStatTone, string> = {
  default: 'bg-muted text-muted-foreground',
  positive: 'bg-secondary text-secondary-foreground',
  brand: 'bg-accent text-accent-foreground',
  danger: 'bg-destructive/10 text-destructive',
};

interface AccountStatCardProps {
  label: string;
  /** رشته‌ی آماده‌ی نمایش؛ `null` وقتی داده هنوز در دسترس نیست. */
  value: string | null;
  icon?: ReactNode;
  tone?: AccountStatTone;
  className?: string;
}

export function AccountStatCard({
  label,
  value,
  icon,
  tone = 'default',
  className,
}: AccountStatCardProps) {
  return (
    <Card className={cn('gap-0 py-0', className)}>
      <CardContent className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          <p className="text-base font-bold tabular-nums text-foreground sm:text-lg">
            {value ?? '—'}
          </p>
        </div>
        {icon ? (
          <span
            aria-hidden
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full',
              TONE_CLASSES[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
