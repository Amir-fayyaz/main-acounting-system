import type { Metadata } from 'next';
import { PanelPlaceholder } from '@/core/features/panel/components/block/placeholder/PanelPlaceholder';

export const metadata: Metadata = { title: 'میز کار' };

export default function PanelPage() {
  return <PanelPlaceholder title="میز کار" />;
}
