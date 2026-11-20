import { Card, CardContent, Skeleton } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

/** Accent for a stat hint line (prototype `.kpi em`). */
export type ListStatTone = 'positive' | 'negative' | 'neutral';

export type ListStatItem = {
  id: string;
  label: string;
  /** Pre-formatted Persian value (use `formatMoney` / `formatShortMoney`). */
  value: string;
  /** Small secondary line rendered under the value. */
  hint?: string;
  tone?: ListStatTone;
};

/**
 * Statistics presentation contract for panel list pages:
 * `loading` renders skeletons, `error` renders an alert, and `success`
 * renders KPI cards. Pages compute items from the filtered result set.
 */
export type ListStatsState =
  | { status: 'loading'; count?: number }
  | { status: 'error'; message?: string }
  | { status: 'success'; items: readonly ListStatItem[] };

export type StatsRowProps = {
  stats: ListStatsState;
  className?: string;
};

const TONE_CLASS: Record<ListStatTone, string> = {
  positive: 'text-primary',
  negative: 'text-destructive',
  neutral: 'text-muted-foreground',
};

const DEFAULT_ERROR_MESSAGE = 'دریافت آمار با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';

function StatsLoading({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="در حال بارگذاری آمار" className="grid gap-4 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <Card key={index}>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-7 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Prototype `#stats` row: KPI cards in a three-column grid with loading/error states. */
export function StatsRow({ stats, className }: StatsRowProps) {
  if (stats.status === 'loading') return <StatsLoading count={stats.count} />;
  if (stats.status === 'error') {
    return (
      <div
        role="alert"
        className={cn(
          'rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive',
          className,
        )}
      >
        {stats.message ?? DEFAULT_ERROR_MESSAGE}
      </div>
    );
  }
  if (stats.items.length === 0) return null;

  return (
    <div className={cn('grid gap-4 lg:grid-cols-3', className)} aria-label="آمار فهرست">
      {stats.items.map((item) => (
        <Card key={item.id}>
          <CardContent className="space-y-1.5">
            <span className="block text-[13px] text-muted-foreground">{item.label}</span>
            <b className="block text-[17px] font-bold leading-snug tabular-nums sm:text-[21px]">
              {item.value}
            </b>
            {item.hint ? (
              <span
                className={cn(
                  'block text-xs',
                  item.tone ? TONE_CLASS[item.tone] : 'text-muted-foreground',
                )}
              >
                {item.hint}
              </span>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
