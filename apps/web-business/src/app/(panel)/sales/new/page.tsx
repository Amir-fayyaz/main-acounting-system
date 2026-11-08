import type { Metadata } from 'next';
import { PanelPlaceholder } from '@/core/features/panel/components/block/placeholder/PanelPlaceholder';

export const metadata: Metadata = { title: 'فاکتور جدید' };

export default function Page() {
  return <PanelPlaceholder title="فاکتور جدید" />;
}
