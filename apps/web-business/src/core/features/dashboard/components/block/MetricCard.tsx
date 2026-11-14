import { Card, CardContent } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

import type { DashboardMetric } from '../../assets/@types';
import { formatShortMoney, splitShortMoney } from '../../../shared';

export function MetricCard({ label, value, description, trend, highlight }: DashboardMetric) {
  const { amount, unit } = splitShortMoney(formatShortMoney(value));

  return (
    <Card className={cn('rounded-lg', highlight && 'bg-accent')}>
      <CardContent className="space-y-1.5">
        <span className="block text-[13px] text-muted-foreground">{label}</span>
        <b className="block text-[17px] font-bold leading-snug tabular-nums sm:text-[21px]">
          <span>{amount}</span>
          {unit ? (
            <span className="ms-1 text-xs font-medium text-muted-foreground">{unit}</span>
          ) : null}
        </b>
        {description ? (
          <span
            className={cn(
              'block text-xs',
              trend === 'negative' ? 'text-destructive' : 'text-success',
            )}
          >
            {description}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
