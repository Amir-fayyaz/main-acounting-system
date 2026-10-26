import type { SidebarNavigationGroup } from '../../../ui/sidebar/assets/@types/sidebar';

export type PanelType = 'user' | 'business-owner' | 'admin';

export interface PanelConfiguration {
  type: PanelType;
  title: string;
  subtitle: string;
  homeHref: string;
  monogram: string;
  navigation: readonly SidebarNavigationGroup[];
}

export interface PanelAccount {
  name: string;
  description: string;
  avatarSrc?: string;
}
