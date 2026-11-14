import type { Metadata } from 'next';

import { AccountsPage } from '@/core/features/accounts';

export const metadata: Metadata = { title: 'بانک و صندوق' };

export default function Page() {
  return <AccountsPage />;
}
