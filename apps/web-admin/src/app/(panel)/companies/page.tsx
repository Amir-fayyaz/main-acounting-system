import type { Metadata } from 'next';
import { PanelPlaceholder } from '@/core/features/panel/components/block/placeholder/PanelPlaceholder';

export const metadata: Metadata = { title: 'لیست شرکت‌ها' };

export default function CompaniesPage() {
  return <PanelPlaceholder title="لیست شرکت‌ها" />;
}
