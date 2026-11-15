import type { Metadata } from 'next';
import { ReportsPage } from '@/core/features/reports';

export const metadata: Metadata = { title: 'گزارش‌ها' };

export default function PanelPage() {
  return <ReportsPage />;
}
