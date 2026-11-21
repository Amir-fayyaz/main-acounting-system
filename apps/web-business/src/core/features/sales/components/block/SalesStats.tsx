'use client';

import { Card, CardContent } from '@repo/web';

import type { SalesOverview } from '../../utils/overview';
import { formatMoney } from '../../utils/format';

export type SalesStatsProps = {
  overview: Pick<
    SalesOverview,
    'totalSales' | 'totalDiscount' | 'discountCount' | 'outstanding' | 'totalCommission'
  >;
};

/** Summary cards for the sales list (totals of the filtered rows). */
export function SalesStats({
  overview: { totalSales, totalDiscount, discountCount, outstanding, totalCommission },
}: SalesStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
      <Card className="gap-2">
        <CardContent className="grid gap-1 py-4">
          <span className="text-sm text-muted-foreground">جمع فروش (پس از تخفیف)</span>
          <b className="text-lg font-semibold">{formatMoney(totalSales)} ریال</b>
        </CardContent>
      </Card>
      <Card className="gap-2">
        <CardContent className="grid gap-1 py-4">
          <span className="text-sm text-muted-foreground">جمع تخفیف‌ها</span>
          <b className="text-lg font-semibold">
            {formatMoney(totalDiscount)} ریال · {discountCount.toLocaleString('fa-IR')} فاکتور
          </b>
        </CardContent>
      </Card>
      <Card className="gap-2">
        <CardContent className="grid gap-1 py-4">
          <span className="text-sm text-muted-foreground">مانده مطالبات</span>
          <b className="text-lg font-semibold">{formatMoney(outstanding)} ریال</b>
        </CardContent>
      </Card>
      <Card className="gap-2">
        <CardContent className="grid gap-1 py-4">
          <span className="text-sm text-muted-foreground">جمع پورسانت فروشندگان</span>
          <b className="text-lg font-semibold">{formatMoney(totalCommission)} ریال</b>
        </CardContent>
      </Card>
    </div>
  );
}
