'use client';

import { useEffect, useRef } from 'react';
import { Button } from '../../../../../shadcn/ui/button/button';
import { useSidebar } from '../../../../../shadcn/ui/sidebar/sidebar';
import { cn } from '../../../../../../utils/cn';
import { CiMenuBurger, CiViewColumn } from 'react-icons/ci';

export function PanelSidebarToggle({
  className,
  restoreFocus = false,
}: {
  className?: string;
  restoreFocus?: boolean;
}) {
  const { isMobile, openMobile, state, toggleSidebar } = useSidebar();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(openMobile);
  const expanded = isMobile ? openMobile : state === 'expanded';

  useEffect(() => {
    const closed = wasOpen.current && !openMobile;
    wasOpen.current = openMobile;
    if (restoreFocus && isMobile && closed) {
      const frame = requestAnimationFrame(() => triggerRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [isMobile, openMobile, restoreFocus]);

  return (
    <Button
      ref={triggerRef}
      type="button"
      variant="ghost"
      size="icon"
      aria-label={expanded ? 'بستن منو' : 'باز کردن منو'}
      aria-expanded={expanded}
      onClick={toggleSidebar}
      className={cn(
        'size-11 rounded-lg text-muted-foreground hover:bg-accent [&_svg]:size-5',
        className,
      )}
    >
      {isMobile ? <CiMenuBurger aria-hidden="true" /> : <CiViewColumn aria-hidden="true" />}
    </Button>
  );
}
