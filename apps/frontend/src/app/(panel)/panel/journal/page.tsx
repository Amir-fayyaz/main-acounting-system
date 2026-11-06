import type { Metadata } from 'next';
import { JournalView } from '@/core/features/panel/components/block/journal/JournalView';

export const metadata: Metadata = { title: 'دفتر روزنامه' };

export default function PanelPage() {
  return <JournalView />;
}
