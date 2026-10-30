import type { Metadata } from 'next';
import { PanelPlaceholder } from '@/core/features/panel/components/block/placeholder/PanelPlaceholder';

export const metadata: Metadata = { title: 'مدیریت دسترسی' };

export default function AccessPage() {
  return <PanelPlaceholder title="مدیریت دسترسی" />;
}
