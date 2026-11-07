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
import { cn } from '../../../../utils/cn';
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
        <SidebarHeader className="h-16 border-b px-4 py-0 [--radius:inherit]">
          {header}
        </SidebarHeader>
      )}
      <SidebarContent className="overflow-x-hidden px-3 pt-3.5 pb-3.5 [--radius:inherit] group-data-[collapsible=icon]:overflow-y-auto group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pt-2.5 group-data-[collapsible=icon]:pb-2.5">
        <nav aria-label="منوی پنل">
          {navigation.map((group, index) => (
            <SidebarGroup
              key={group.id}
              className={cn(
                'p-0',
                index > 0 &&
                  'mt-[18px] group-data-[collapsible=icon]:mt-2.5 group-data-[collapsible=icon]:border-t group-data-[collapsible=icon]:border-border group-data-[collapsible=icon]:pt-2.5',
              )}
            >
              <SidebarGroupLabel
                asChild
                className="h-auto pb-1.5 font-medium tracking-normal text-muted-foreground normal-case group-data-[collapsible=icon]:hidden"
              >
                <Span className="text-xs font-medium">{group.label}</Span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0">
                  {group.items.map((item) =>
                    item.children ? (
                      <SidebarNavigationBranch key={item.id} item={item} activeHref={activeHref} />
                    ) : (
                      <SidebarMenuItem key={item.href}>
                        {activeHref === item.href && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-y-2.5 start-[-12px] w-[3px] rounded-r-[3px] bg-primary group-data-[collapsible=icon]:hidden"
                          />
                        )}
                        <SidebarMenuButton
                          asChild
                          isActive={activeHref === item.href}
                          data-active={activeHref === item.href ? true : undefined}
                          tooltip={{
                            children: <Span className="text-xs">{item.label}</Span>,
                            side: 'left',
                          }}
                          className="h-[42px] gap-3 rounded-md font-medium hover:bg-muted text-start group-data-[collapsible=icon]:justify-center [&_svg]:size-5 data-[active=true]:[&_svg]:text-brand-dark"
                        >
                          <Link
                            href={item.href}
                            aria-label={item.label}
                            aria-current={activeHref === item.href ? 'page' : undefined}
                            onClick={() => setOpenMobile(false)}
                          >
                            <SidebarIcon name={item.icon} />
                            <Span className="min-w-0 flex-1 truncate text-sm group-data-[collapsible=icon]:hidden">
                              {item.label}
                            </Span>
                            {item.badge != null && (
                              <span className="grid size-[22px] place-items-center rounded-full bg-primary text-[11.5px] font-semibold text-primary-foreground tabular-nums group-data-[collapsible=icon]:hidden">
                                {item.badge.toLocaleString('fa-IR')}
                              </span>
                            )}
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
