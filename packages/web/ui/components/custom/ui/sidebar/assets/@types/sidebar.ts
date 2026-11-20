export type SidebarIconName =
  | 'CiBank'
  | 'CiBoxes'
  | 'CiCalculator1'
  | 'CiCreditCard1'
  | 'CiFileOn'
  | 'CiGrid41'
  | 'CiHome'
  | 'CiLock'
  | 'CiMoneyCheck1'
  | 'CiRead'
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
  /** Optional count pill rendered at the item's inline end, hidden on the icon rail. */
  badge?: number;
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
