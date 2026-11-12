import type { Metadata } from 'next';

import { ChecksPage } from '@/core/features/checks';

export const metadata: Metadata = { title: 'چک‌ها' };

export default function Page() {
  return <ChecksPage />;
}
