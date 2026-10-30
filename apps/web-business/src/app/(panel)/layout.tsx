import type { ReactNode } from 'react';
import { PanelLayout } from '@repo/web/ui/panel';
import { businessPanelConfig } from '@/core/features/panel/assets/mock/navigation';

export default function BusinessPanelLayout({ children }: { children: ReactNode }) {
  return <PanelLayout config={businessPanelConfig}>{children}</PanelLayout>;
}
