import { Suspense } from 'react';
import type { Metadata } from 'next';
import { FiscalYearsPage } from '@/core/features/fiscal-periods';

export const metadata: Metadata = { title: 'سال‌های مالی' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <FiscalYearsPage />
    </Suspense>
  );
}
