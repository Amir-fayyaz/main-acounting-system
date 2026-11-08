export type SidebarIconName =
  | 'CiBank'
  | 'CiBoxes'
  | 'CiCalculator1'
  | 'CiCreditCard1'
  | 'CiFileOn'
  | 'CiGrid41'
  | 'CiMoneyCheck1'
  | 'CiReceipt'
  | 'CiRepeat'
  | 'CiSettings'
  | 'CiShop'
  | 'CiShoppingBasket'
  | 'CiShoppingCart'
  | 'CiUser';

export interface SidebarNavigationLink {
  label: string;
  href: string;
  icon?: SidebarIconName;
}

export interface SidebarNavigationBranch {
  id: string;
  label: string;
  icon: SidebarIconName;
  children: readonly SidebarNavigationLink[];
  defaultOpen?: boolean;
  href?: never;
}

export type SidebarNavigationItem =
  (SidebarNavigationLink & { icon: SidebarIconName; children?: never }) | SidebarNavigationBranch;

export interface SidebarNavigationGroup {
  id: string;
  label: string;
  items: readonly SidebarNavigationItem[];
}
