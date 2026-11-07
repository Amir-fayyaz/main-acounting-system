import type { Metadata } from 'next';
import { FiscalSetupPage } from '@/core/features/fiscal/components/block/FiscalSetupPage';

export const metadata: Metadata = { title: 'راه‌اندازی مالی' };

export default function FiscalSetupRoute() {
  return <FiscalSetupPage />;
}
