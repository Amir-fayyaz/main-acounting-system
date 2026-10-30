import type { ReactNode } from 'react';
import { PanelLayout } from '@repo/web/ui/panel';
import { adminPanelConfig } from '@/core/features/panel/assets/mock/navigation';

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return <PanelLayout config={adminPanelConfig}>{children}</PanelLayout>;
}
