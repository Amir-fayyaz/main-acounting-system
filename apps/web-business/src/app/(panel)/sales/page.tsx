import type { Metadata } from 'next';
import { SalesPage } from '@/core/features/sales';

export const metadata: Metadata = { title: 'فاکتورهای فروش' };

export default function Page() {
  return <SalesPage />;
}
