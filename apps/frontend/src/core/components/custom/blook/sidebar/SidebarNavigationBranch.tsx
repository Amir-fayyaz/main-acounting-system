'use client';

import Link from 'next/link';
import { SidebarIcon } from './SidebarIcon';
import { useId, useState } from 'react';
import { CiCircleChevDown } from 'react-icons/ci';
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  Span,
  useSidebar,
} from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';
import type { SidebarNavigationBranch as NavigationBranch } from './assets/@types/sidebar';

export function SidebarNavigationBranch({
  item,
  activeHref,
}: {
  item: NavigationBranch;
  activeHref?: string;
}) {
  const { isMobile, state, setOpen, setOpenMobile } = useSidebar();
  const [expanded, setExpanded] = useState(item.defaultOpen ?? false);
  const [dismissedActiveHref, setDismissedActiveHref] = useState<string>();
  const contentId = useId();
  const hasActiveChild = item.children.some((child) => child.href === activeHref);
  const isOpen = expanded || (hasActiveChild && dismissedActiveHref !== activeHref);
  const isIconRail = !isMobile && state === 'collapsed';

  function toggle() {
    if (isIconRail) {
      setOpen(true);
      setExpanded(true);
      setDismissedActiveHref(undefined);
    } else if (isOpen) {
      setExpanded(false);
      setDismissedActiveHref(activeHref);
    } else {
      setExpanded(true);
      setDismissedActiveHref(undefined);
    }
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        onClick={toggle}
        aria-label={item.label}
        aria-expanded={!isIconRail && isOpen}
        aria-controls={contentId}
        isActive={hasActiveChild}
        data-active={hasActiveChild ? true : undefined}
        tooltip={{ children: <Span className="text-xs">{item.label}</Span>, side: 'left' }}
        className="h-auto min-h-11 gap-3 rounded-lg text-start group-data-[collapsible=icon]:mx-auto [&_svg]:size-5 data-[active=true]:[&_svg]:text-brand-dark"
      >
        <SidebarIcon name={item.icon} />
        <Span className="min-w-0 flex-1 truncate text-start text-sm group-data-[collapsible=icon]:hidden">
          {item.label}
        </Span>
        <CiCircleChevDown
          aria-hidden="true"
          className={cn(
            'ms-auto shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none group-data-[collapsible=icon]:hidden',
            isOpen && 'rotate-180',
          )}
        />
      </SidebarMenuButton>
      <div id={contentId} hidden={!isOpen || isIconRail}>
        <SidebarMenuSub className="ms-6 me-0 translate-x-0 border-s border-l-0 ps-3 pe-0">
          {item.children.map((child) => (
            <SidebarMenuSubItem key={child.href}>
              <SidebarMenuSubButton
                asChild
                isActive={activeHref === child.href}
                data-active={activeHref === child.href ? true : undefined}
                className="h-auto min-h-11 translate-x-0 rounded-lg text-muted-foreground data-[active=true]:font-medium data-[active=true]:text-foreground"
              >
                <Link
                  href={child.href}
                  aria-current={activeHref === child.href ? 'page' : undefined}
                  onClick={() => setOpenMobile(false)}
                >
                  <Span className="truncate text-sm">{child.label}</Span>
                </Link>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </div>
    </SidebarMenuItem>
  );
}
