import type { Metadata } from 'next';
import { SettingsPage } from '@/core/features/settings';

export const metadata: Metadata = { title: 'تنظیمات' };

export default function SettingsRoutePage() {
  return <SettingsPage />;
}
