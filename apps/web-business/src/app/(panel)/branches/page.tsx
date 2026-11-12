import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BranchesPage } from '@/core/features/branches';

export const metadata: Metadata = { title: 'شعب' };

export default function BranchesPageRoute() {
  return (
    <Suspense fallback={null}>
      <BranchesPage />
    </Suspense>
  );
}
