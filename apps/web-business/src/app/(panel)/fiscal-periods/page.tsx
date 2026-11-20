import { Suspense } from 'react';
import type { Metadata } from 'next';
import { FiscalPeriodsPage } from '@/core/features/fiscal-periods';

export const metadata: Metadata = { title: 'دوره‌های مالی' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <FiscalPeriodsPage />
    </Suspense>
  );
}
