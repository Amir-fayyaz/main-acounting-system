import { Suspense } from 'react';
import type { Metadata } from 'next';
import { FiscalSetupWizard } from '@/core/features/fiscal-periods';

export const metadata: Metadata = { title: 'راه‌اندازی مالی' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <FiscalSetupWizard />
    </Suspense>
  );
}
