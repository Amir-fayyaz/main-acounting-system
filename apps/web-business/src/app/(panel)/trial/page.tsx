import { Suspense } from 'react';
import type { Metadata } from 'next';
import { TrialPage } from '@/core/features/trial';

export const metadata: Metadata = { title: 'تراز آزمایشی' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TrialPage />
    </Suspense>
  );
}
