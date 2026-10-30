import type { Metadata } from 'next';
import { PanelPlaceholder } from '@/core/features/panel/components/block/placeholder/PanelPlaceholder';

export const metadata: Metadata = { title: 'داشبورد' };

export default function DashboardPage() {
  return <PanelPlaceholder title="داشبورد" />;
}
