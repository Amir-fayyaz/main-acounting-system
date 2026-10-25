import type { ReactNode } from 'react';
import { accountingPanelConfig } from '../../../assets/mock/navigation';
import { PanelLayout } from './PanelLayout';

export function AccountingPanelLayout({
  children,
  defaultSidebarOpen = true,
}: {
  children: ReactNode;
  defaultSidebarOpen?: boolean;
}) {
  return (
    <PanelLayout config={accountingPanelConfig} defaultSidebarOpen={defaultSidebarOpen}>
      {children}
    </PanelLayout>
  );
}
