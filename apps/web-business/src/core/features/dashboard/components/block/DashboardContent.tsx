import type { DashboardSnapshot } from '../../assets/@types';
import type { Cheque, Invoice } from '../../../panel/assets/@types/finance';

import { DashboardCharts } from './DashboardCharts';
import { DashboardLists } from './DashboardLists';
import { MetricCard } from './MetricCard';

export function DashboardContent({
  snapshot,
  invoices,
  cheques,
}: {
  snapshot: DashboardSnapshot;
  invoices: Invoice[];
  cheques: Cheque[];
}) {
  const dueCheques = cheques
    .filter((cheque) => cheque.status === 'near-due' || cheque.status === 'pending')
    .slice(0, 4);

  return (
    <div className="space-y-4">
      <section aria-label="شاخص‌های مالی" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {snapshot.metrics.map((metric) => (
          <MetricCard key={metric.id} {...metric} />
        ))}
      </section>
      <DashboardCharts cashflow={snapshot.cashflow} paymentMethods={snapshot.paymentMethods} />
      <DashboardLists invoices={invoices} cheques={dueCheques} tasks={snapshot.tasks} />
    </div>
  );
}
