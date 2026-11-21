import { ArrowDownLeft, ArrowUpRight, Clock } from 'lucide-react';

import type { ChequeStats } from '../../assets/@types/cheque.types';
import { ChequeStatCard } from '../ui/ChequeStatCard';

interface ChecksStatsProps {
  stats: ChequeStats | null;
}

export function ChecksStats({ stats }: ChecksStatsProps) {
  return (
    <section aria-label="خلاصه‌ی وضعیت چک‌ها" className="grid gap-3 sm:grid-cols-3">
      <ChequeStatCard
        label="چک‌های دریافتی"
        value={stats ? stats.received : null}
        tone="positive"
        icon={<ArrowDownLeft className="size-5" />}
      />
      <ChequeStatCard
        label="چک‌های پرداختی"
        value={stats ? stats.issued : null}
        tone="brand"
        icon={<ArrowUpRight className="size-5" />}
      />
      <ChequeStatCard
        label="سررسیدشده"
        value={stats ? stats.overdue : null}
        tone="danger"
        icon={<Clock className="size-5" />}
      />
    </section>
  );
}
