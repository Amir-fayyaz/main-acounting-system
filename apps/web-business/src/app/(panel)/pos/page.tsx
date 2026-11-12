import type { Metadata } from 'next';

import { PosPage } from '@/core/features/pos';

export const metadata: Metadata = { title: 'دستگاه‌های POS' };

export default function Page() {
  return <PosPage />;
}
