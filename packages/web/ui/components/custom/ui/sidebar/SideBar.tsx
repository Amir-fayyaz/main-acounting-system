'use client';

import Link from 'next/link';
import { SidebarIcon } from './SidebarIcon';
import type { ComponentProps, ReactNode } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '../../../shadcn/ui/sidebar/sidebar';
import { Span } from '../typography/Typography';
import { SidebarNavigationBranch } from './SidebarNavigationBranch';
import type { SidebarNavigationGroup } from './assets/@types/sidebar';

export interface AppSidebarProps extends ComponentProps<typeof Sidebar> {
  navigation: readonly SidebarNavigationGroup[];
  activeHref?: string;
  header?: ReactNode;
  footer?: ReactNode;
}

/** Shared navigation renderer; panel identity and destinations belong to its caller. */
export function AppSidebar({ navigation, activeHref, header, footer, ...props }: AppSidebarProps) {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar {...props}>
      {header && (
        <SidebarHeader className="border-b p-3 [--radius:inherit]">{header}</SidebarHeader>
      )}
      <SidebarContent className="gap-3 overflow-x-hidden py-3 [--radius:inherit] group-data-[collapsible=icon]:overflow-y-auto">
        <nav aria-label="منوی پنل">
          {navigation.map((group) => (
            <SidebarGroup key={group.id} className="px-3 py-2">
              <SidebarGroupLabel
                asChild
                className="tracking-normal text-muted-foreground normal-case"
              >
                <Span className="text-xs font-medium">{group.label}</Span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) =>
                    item.children ? (
                      <SidebarNavigationBranch key={item.id} item={item} activeHref={activeHref} />
                    ) : (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={activeHref === item.href}
                          data-active={activeHref === item.href ? true : undefined}
                          tooltip={{
                            children: <Span className="text-xs">{item.label}</Span>,
                            side: 'left',
                          }}
                          className="h-auto min-h-11 gap-3 rounded-lg text-start group-data-[collapsible=icon]:mx-auto [&_svg]:size-5 data-[active=true]:[&_svg]:text-brand-dark"
                        >
                          <Link
                            href={item.href}
                            aria-label={item.label}
                            aria-current={activeHref === item.href ? 'page' : undefined}
                            onClick={() => setOpenMobile(false)}
                          >
                            <SidebarIcon name={item.icon} />
                            <Span className="truncate text-sm group-data-[collapsible=icon]:hidden">
                              {item.label}
                            </Span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ),
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
      {footer && <SidebarFooter className="border-t p-3">{footer}</SidebarFooter>}
    </Sidebar>
  );
}
