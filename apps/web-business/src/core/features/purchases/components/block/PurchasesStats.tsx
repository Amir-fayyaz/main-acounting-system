'use client';

import { Card, CardContent } from '@repo/web';

import type { Purchase } from '../../assets/@types/purchase';
import { formatMoney } from '../../utils/format';
import { calculatePurchaseStats } from '../../utils/stats';

export type PurchasesStatsProps = {
  purchases: readonly Purchase[];
};

export function PurchasesStats({ purchases }: PurchasesStatsProps) {
  const { totalAmount, totalDiscount, discountedCount } = calculatePurchaseStats(purchases);

  return (
    <div className="grid gap-4 sm:grid-cols-3 print:hidden">
      <Card className="gap-2">
        <CardContent className="grid gap-1 py-4">
          <span className="text-sm text-muted-foreground">جمع خرید (پس از تخفیف)</span>
          <b className="text-lg font-semibold">{formatMoney(totalAmount)} ریال</b>
        </CardContent>
      </Card>
      <Card className="gap-2">
        <CardContent className="grid gap-1 py-4">
          <span className="text-sm text-muted-foreground">جمع تخفیف‌ها</span>
          <b className="text-lg font-semibold">{formatMoney(totalDiscount)} ریال</b>
        </CardContent>
      </Card>
      <Card className="gap-2">
        <CardContent className="grid gap-1 py-4">
          <span className="text-sm text-muted-foreground">فاکتورهای دارای تخفیف</span>
          <b className="text-lg font-semibold">{formatMoney(discountedCount)}</b>
        </CardContent>
      </Card>
    </div>
  );
}
