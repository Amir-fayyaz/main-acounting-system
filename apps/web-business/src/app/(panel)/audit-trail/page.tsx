import type { Metadata } from 'next';
import { AuditPage } from '@/core/features/audit';

export const metadata: Metadata = { title: 'تاریخچه تغییرات' };

export default function Page() {
  return <AuditPage />;
}
