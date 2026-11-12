import type { ReactNode } from 'react';

import { Card, CardContent } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

import { formatCountFa } from '../../utils/format';

type ChequeStatTone = 'default' | 'positive' | 'danger' | 'brand';

const TONE_CLASSES: Record<ChequeStatTone, string> = {
  default: 'bg-muted text-muted-foreground',
  positive: 'bg-secondary text-secondary-foreground',
  danger: 'bg-destructive/10 text-destructive',
  brand: 'bg-accent text-accent-foreground',
};

interface ChequeStatCardProps {
  label: string;
  /** `null` وقتی داده هنوز/دیگر در دسترس نیست. */
  value: number | null;
  icon?: ReactNode;
  tone?: ChequeStatTone;
  className?: string;
}

export function ChequeStatCard({
  label,
  value,
  icon,
  tone = 'default',
  className,
}: ChequeStatCardProps) {
  return (
    <Card className={cn('gap-0 py-0', className)}>
      <CardContent className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          <p className="text-xl font-bold tabular-nums text-foreground sm:text-2xl">
            {value === null ? '—' : formatCountFa(value)}
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
