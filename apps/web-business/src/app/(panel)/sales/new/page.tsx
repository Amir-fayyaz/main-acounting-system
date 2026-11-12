import type { Metadata } from 'next';
import { NewSalePage } from '@/core/features/sales';

export const metadata: Metadata = { title: 'فاکتور جدید' };

export default function Page() {
  return <NewSalePage />;
}
