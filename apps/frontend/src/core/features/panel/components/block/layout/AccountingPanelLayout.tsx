import type { ReactNode } from 'react';
import { accountingPanelConfig } from '../../../assets/mock/navigation';
import { PanelLayout } from '@repo/web/ui/panel';
import { PanelLogoutControl } from '../../ui/PanelLogoutControl';

export function AccountingPanelLayout({
  children,
  defaultSidebarOpen = true,
}: {
  children: ReactNode;
  defaultSidebarOpen?: boolean;
}) {
  return (
    <PanelLayout
      config={accountingPanelConfig}
      defaultSidebarOpen={defaultSidebarOpen}
      account={{ name: 'علی رضایی', description: 'مدیر مالی' }}
      logoutControl={<PanelLogoutControl />}
    >
      {children}
    </PanelLayout>
  );
}
