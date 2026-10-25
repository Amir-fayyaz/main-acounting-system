import Link from 'next/link';
import type { ReactNode } from 'react';
import { SidebarProvider, Small, Span, TooltipProvider } from '@repo/web/ui';
import type {
  PanelAccount as PanelAccountDetails,
  PanelConfiguration,
} from '../../../assets/@types/panel';
import { PanelSidebar } from '../sidebar/PanelSidebar';
import { PanelAccount } from '../../ui/account/PanelAccount';
import { PanelSidebarToggle } from '../../ui/sidebar-toggle/PanelSidebarToggle';
import { PanelHeader } from '../header/PanelHeader';

export interface PanelLayoutProps {
  config: PanelConfiguration;
  children: ReactNode;
  account?: PanelAccountDetails;
  headerActions?: ReactNode;
  defaultSidebarOpen?: boolean;
}

/** Server-rendered shell; interactive controls live in their own client components. */
export function PanelLayout({
  config,
  children,
  account,
  headerActions,
  defaultSidebarOpen = true,
}: PanelLayoutProps) {
  return (
    <TooltipProvider>
      <SidebarProvider
        defaultOpen={defaultSidebarOpen}
        dir="rtl"
        data-panel-type={config.type}
        className="min-w-0 bg-background text-foreground motion-reduce:[&_*]:transition-none motion-reduce:[&_*]:animate-none"
      >
        <Link
          href="#panel-content"
          className="sr-only rounded-lg bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50"
        >
          <Span className="text-sm">رفتن به محتوای صفحه</Span>
        </Link>
        <PanelSidebar
          side="right"
          dir="rtl"
          collapsible="icon"
          navigation={config.navigation}
          header={
            <div className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:justify-center">
              <Link
                href={config.homeHref}
                aria-label={config.title}
                className="flex min-w-0 flex-1 items-center gap-3 group-data-[collapsible=icon]:hidden"
              >
                <Span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-lg font-bold text-primary-foreground"
                >
                  {config.monogram}
                </Span>
                <div className="flex min-w-0 flex-col gap-1">
                  <Span className="truncate text-sm font-bold">{config.title}</Span>
                  <Small className="truncate text-xs text-muted-foreground">
                    {config.subtitle}
                  </Small>
                </div>
              </Link>
              <PanelSidebarToggle />
            </div>
          }
          footer={<PanelAccount account={account} />}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <PanelHeader navigation={config.navigation} actions={headerActions} />
          <main
            id="panel-content"
            tabIndex={-1}
            className="flex min-w-0 flex-1 flex-col outline-none"
          >
            {children}
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
