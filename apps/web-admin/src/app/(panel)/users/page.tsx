import type { Metadata } from 'next';
import { PanelPlaceholder } from '@/core/features/panel/components/block/placeholder/PanelPlaceholder';

export const metadata: Metadata = { title: 'لیست کاربران' };

export default function UsersPage() {
  return <PanelPlaceholder title="لیست کاربران" />;
}
