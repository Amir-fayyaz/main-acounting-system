import type { ReactNode } from 'react';
import type { Principal } from '@repo/web/session';
import { accountingPanelConfig } from '../../../assets/mock/navigation';
import { PanelLayout } from '@repo/web/ui/panel';
import { PanelLogoutControl } from '../../ui/PanelLogoutControl';

export function AccountingPanelLayout({
  children,
  defaultSidebarOpen = true,
  userPrincipal,
}: {
  children: ReactNode;
  defaultSidebarOpen?: boolean;
  userPrincipal?: Principal;
}) {
  return (
    <PanelLayout
      config={accountingPanelConfig}
      defaultSidebarOpen={defaultSidebarOpen}
      account={{ 
        name: userPrincipal?.displayName || 'کاربر',
        description: userPrincipal?.email || ''
      }}
      logoutControl={<PanelLogoutControl />}
    >
      {children}
    </PanelLayout>
  );
}
