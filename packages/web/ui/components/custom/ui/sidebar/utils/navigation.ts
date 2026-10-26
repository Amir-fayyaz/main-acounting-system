import type {
  SidebarIconName,
  SidebarNavigationGroup,
  SidebarNavigationLink,
} from '../assets/@types/sidebar';

/** Only destinations are searchable; sublinks inherit their parent's icon when omitted. */
export function getSidebarLinks(
  navigation: readonly SidebarNavigationGroup[],
): (SidebarNavigationLink & { icon: SidebarIconName })[] {
  return navigation.flatMap((group) =>
    group.items.flatMap((item) =>
      item.children
        ? item.children.map((child) => ({ ...child, icon: child.icon ?? item.icon }))
        : [item],
    ),
  );
}
