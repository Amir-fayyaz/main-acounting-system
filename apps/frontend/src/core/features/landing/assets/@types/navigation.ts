import type { LandingIconName } from '@/core/features/landing/components/ui/icon/LandingIcon';

export interface NavigationLink {
  href: string;
  label: string;
}

export interface ProductMenuItem {
  href: string;
  label: string;
  description: string;
  icon: LandingIconName;
}

export interface FooterColumn {
  title: string;
  ariaLabel: string;
  links: NavigationLink[];
}
