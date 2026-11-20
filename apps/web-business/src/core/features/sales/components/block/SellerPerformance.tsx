'use client';

import { Card, P } from '@repo/web';

import type { SellerStat } from '../../utils/overview';
import { formatMoney } from '../../utils/format';

export type SellerPerformanceProps = {
  sellerStats: readonly SellerStat[];
};

/** Per-seller invoice count, revenue and commission for the current filters. */
export function SellerPerformance({ sellerStats }: SellerPerformanceProps) {
  return (
    <div className="space-y-2 print:hidden">
      <P className="text-sm text-muted-foreground">عملکرد فروشندگان (طبق فیلترهای فعلی)</P>
      <div className="grid gap-3 sm:grid-cols-3">
        {sellerStats.map((stat) => (
          <Card key={stat.seller} className="space-y-1 p-3">
            <P className="text-sm font-medium">{stat.seller}</P>
            <P className="text-base font-bold">
              {stat.count.toLocaleString('fa-IR')} فاکتور · {formatMoney(stat.total)} ریال
            </P>
            <P className="text-xs text-muted-foreground">
              پورسانت: {formatMoney(stat.comm)} ریال ({stat.rate.toLocaleString('fa-IR')}٪)
            </P>
          </Card>
        ))}
      </div>
    </div>
  );
}
