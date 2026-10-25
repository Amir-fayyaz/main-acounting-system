'use client';

import { usePathname } from 'next/navigation';
import { AppSidebar, type AppSidebarProps } from '@/core/components/custom/blook/sidebar/SideBar';
import { getActivePanelItem } from '../../../utils/navigation';

export function PanelSidebar(props: Omit<AppSidebarProps, 'activeHref'>) {
  const pathname = usePathname();
  const activeItem = getActivePanelItem(props.navigation, pathname);

  return <AppSidebar {...props} activeHref={activeItem?.href} />;
}
