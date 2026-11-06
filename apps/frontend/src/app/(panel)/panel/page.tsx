import type { Metadata } from 'next';
import { DashboardBlock } from '@/core/features/panel/components/block/dashboard/DashboardBlock';

export const metadata: Metadata = { title: 'میز کار' };

export default function PanelPage() {
  return <DashboardBlock />;
}
