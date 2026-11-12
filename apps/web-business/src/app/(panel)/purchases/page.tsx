import type { Metadata } from 'next';
import { PurchasesPage } from '@/core/features/purchases';

export const metadata: Metadata = { title: 'فاکتورهای خرید' };

export default function Page() {
  return <PurchasesPage />;
}
