'use client';

import type { ReactNode } from 'react';
import { Button } from '../../../../../shadcn/ui/button/button';
import { P, Span } from '../../../../ui/typography/Typography';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../../shadcn/ui/popover/popover';
import { CiBellOn, CiDark, CiSun } from 'react-icons/ci';
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
    <header className="sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b bg-background/90 px-3 py-3 backdrop-blur-sm sm:gap-3 sm:px-5">
      <PanelSidebarToggle className="md:hidden" restoreFocus />
      <PanelSearch navigation={navigation} />
      <div className="ms-auto flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={isDark ? 'فعال کردن حالت روشن' : 'فعال کردن حالت تاریک'}
          className="size-11 rounded-lg text-muted-foreground hover:bg-accent"
        >
          {isDark ? (
            <CiDark className="size-5" aria-hidden="true" />
          ) : (
            <CiSun className="size-5" aria-hidden="true" />
          )}
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="اعلان‌ها"
              className="size-11 rounded-lg text-muted-foreground hover:bg-accent"
            >
              <CiBellOn className="size-5" aria-hidden="true" />
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
