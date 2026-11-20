import { Suspense } from 'react';
import type { Metadata } from 'next';
import { NewJournalPage } from '@/core/features/journal';

export const metadata: Metadata = { title: 'ثبت سند مرکب' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <NewJournalPage />
    </Suspense>
  );
}
