import type { IconType } from 'react-icons';
import {
  CiBank,
  CiBoxes,
  CiCalculator1,
  CiCreditCard1,
  CiFileOn,
  CiGrid41,
  CiMoneyCheck1,
  CiReceipt,
  CiRepeat,
  CiSettings,
  CiShop,
  CiShoppingBasket,
  CiShoppingCart,
  CiUser,
} from 'react-icons/ci';
import type { SidebarIconName } from './assets/@types/sidebar';

const icons: Record<SidebarIconName, IconType> = {
  CiBank,
  CiBoxes,
  CiCalculator1,
  CiCreditCard1,
  CiFileOn,
  CiGrid41,
  CiMoneyCheck1,
  CiReceipt,
  CiRepeat,
  CiSettings,
  CiShop,
  CiShoppingBasket,
  CiShoppingCart,
  CiUser,
};

/** Resolve serializable icon names inside the interactive navigation components. */
export function SidebarIcon({ name, className }: { name: SidebarIconName; className?: string }) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" className={className} />;
}
