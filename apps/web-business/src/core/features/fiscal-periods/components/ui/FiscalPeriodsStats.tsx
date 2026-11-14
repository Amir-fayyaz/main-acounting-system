import { Card, CardContent } from '@repo/web';
import type { FiscalStats } from '../../assets/@types';
import { toFaDigits } from '../../utils/fiscal-date';

export interface FiscalPeriodsStatsProps {
  stats: FiscalStats;
}

export function FiscalPeriodsStats({ stats }: FiscalPeriodsStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">دوره‌های باز</div>
          <div className="text-2xl font-bold tabular-nums mt-1 text-success">
            {toFaDigits(stats.openCount)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">دوره‌های بسته</div>
          <div className="text-2xl font-bold tabular-nums mt-1 text-muted-foreground">
            {toFaDigits(stats.closedCount)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">کل دوره‌ها</div>
          <div className="text-2xl font-bold tabular-nums mt-1 text-foreground">
            {toFaDigits(stats.totalCount)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
