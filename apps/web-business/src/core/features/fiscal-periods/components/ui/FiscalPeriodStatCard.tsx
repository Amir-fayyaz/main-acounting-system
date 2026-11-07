import { Card, CardContent, Large, Muted } from '@repo/web/ui';

import { formatNumber } from '../../utils/format';

interface FiscalPeriodStatCardProps {
  label: string;
  value: number;
}

export function FiscalPeriodStatCard({ label, value }: FiscalPeriodStatCardProps) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="space-y-1 px-4 sm:px-5">
        <Muted className="text-xs font-medium sm:text-sm">{label}</Muted>
        <Large className="text-2xl font-extrabold tabular-nums text-foreground sm:text-3xl">
          {formatNumber(value)}
        </Large>
      </CardContent>
    </Card>
  );
}
