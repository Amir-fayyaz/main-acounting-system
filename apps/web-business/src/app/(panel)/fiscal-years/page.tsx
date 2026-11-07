import type { Metadata } from 'next';
import { FiscalYearsPage } from '@/core/features/fiscal/components/block/FiscalYearsPage';

export const metadata: Metadata = { title: 'سال‌های مالی' };

export default function FiscalYearsRoute() {
  return <FiscalYearsPage />;
}
