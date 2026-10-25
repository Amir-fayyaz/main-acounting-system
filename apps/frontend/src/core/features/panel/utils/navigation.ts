import { getSidebarLinks } from '@/core/components/custom/blook/sidebar/utils/navigation';
import type { SidebarNavigationGroup } from '@/core/components/custom/blook/sidebar/assets/@types/sidebar';

/** Use the longest route boundary match so the home link never shadows a child page. */
export function getActivePanelItem(
  navigation: readonly SidebarNavigationGroup[],
  pathname: string,
) {
  return getSidebarLinks(navigation)
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function normalizePanelSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('fa')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, '');
}
