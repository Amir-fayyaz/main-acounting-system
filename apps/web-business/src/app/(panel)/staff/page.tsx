import type { Metadata } from 'next';
import { PanelPlaceholder } from '@/core/features/panel/components/block/placeholder/PanelPlaceholder';

export const metadata: Metadata = { title: 'لیست پرسنل' };

export default function StaffPage() {
  return <PanelPlaceholder title="لیست پرسنل" />;
}
