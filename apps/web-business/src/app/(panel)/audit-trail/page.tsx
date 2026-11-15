import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuditPage } from '@/core/features/audit';

export const metadata: Metadata = { title: 'تاریخچه تغییرات' };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuditPage />
    </Suspense>
  );
}
