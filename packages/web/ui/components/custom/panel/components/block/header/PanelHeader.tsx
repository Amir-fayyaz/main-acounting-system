'use client';

import type { ReactNode } from 'react';
import { Button } from '../../../../../shadcn/ui/button/button';
import { P, Span } from '../../../../ui/typography/Typography';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../../shadcn/ui/popover/popover';
import { Bell, Moon, Sun } from 'lucide-react';
import type { SidebarNavigationGroup } from '../../../../ui/sidebar/assets/@types/sidebar';
import { usePanelTheme } from '../../../hook/usePanelTheme';
import { PanelSearch } from '../../ui/search/PanelSearch';
import { PanelSidebarToggle } from '../../ui/sidebar-toggle/PanelSidebarToggle';

export function PanelHeader({
  navigation,
  actions,
}: {
  navigation: readonly SidebarNavigationGroup[];
  actions?: ReactNode;
}) {
  const { isDark, toggleTheme } = usePanelTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2.5 border-b bg-background/88 px-5 backdrop-blur-[10px]">
      <PanelSidebarToggle className="lg:hidden" restoreFocus />
      <PanelSearch navigation={navigation} />

      <div className="ms-auto flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="تغییر حالت تاریک و روشن"
          title={isDark ? 'تم روشن' : 'تم تاریک'}
          className="size-[38px] rounded-md text-muted-foreground hover:bg-accent"
        >
          {isDark ? (
            <Sun className="size-5" aria-hidden="true" />
          ) : (
            <Moon className="size-5" aria-hidden="true" />
          )}
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="اعلان‌ها"
              className="relative size-[38px] rounded-md text-muted-foreground hover:bg-accent after:absolute after:top-2 after:start-[9px] after:size-2 after:rounded-full after:border-2 after:border-background after:bg-primary"
            >
              <Bell className="size-5" aria-hidden="true" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            dir="rtl"
            className="max-w-full rounded-xl border bg-popover p-4 text-popover-foreground shadow-md"
          >
            <Span className="text-sm font-medium">اعلان‌ها</Span>
            <P className="text-sm text-muted-foreground">اعلان تازه‌ای ندارید.</P>
          </PopoverContent>
        </Popover>

        {actions}
      </div>
    </header>
  );
}
