import { Suspense } from 'react';
import type { Metadata } from 'next';
import { JournalPage } from '@/core/features/journal';

export const metadata: Metadata = { title: 'دفتر روزنامه' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <JournalPage />
    </Suspense>
  );
}
