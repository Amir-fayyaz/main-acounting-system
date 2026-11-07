import type { Metadata } from 'next';
import { FiscalPeriodsPage } from '@/core/features/fiscal-periods/components/block/FiscalPeriodsPage';

export const metadata: Metadata = { title: 'دوره‌های مالی' };

export default function FiscalPeriodsRoute() {
  return <FiscalPeriodsPage />;
}
