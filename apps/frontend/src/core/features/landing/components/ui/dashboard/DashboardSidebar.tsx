import Link from 'next/link';
import type { Dispatch, SetStateAction } from 'react';

import { P, Small, Span } from '@/core/components/custom/ui/typography/Typography';
import { Button } from '@/core/components/shadcn/ui/button/button';
import type { DashboardData, DashboardView } from '@/core/features/landing/assets/@types/dashboard';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { cn } from '@/core/utils/shadcn/utils';

interface DashboardSidebarProps {
  data: DashboardData;
  view: DashboardView;
  onViewChange: Dispatch<SetStateAction<DashboardView>>;
}

export function DashboardSidebar({ data, view, onViewChange }: DashboardSidebarProps) {
  return (
    <aside
      aria-label={data.sidebarAriaLabel}
      className="border-l border-[#e5e2d9] bg-[#f4f3ec] pt-5 px-3 pb-3.5 max-sm:hidden max-md:px-2"
    >
      <div className="inline-flex items-center gap-2 px-2 text-2xl leading-none font-extrabold">
        <Span className="text-[length:inherit] grid size-7 place-items-center rounded-md bg-[#ffa00a] text-[#1a120a]">
          <LandingIcon name="logo" className="h-5 w-5 stroke-[2.4]" />
        </Span>
        <Span className="text-[length:inherit]">{data.brandName}</Span>
      </div>

      <div className="my-6 mb-4 flex items-center gap-2 rounded-md border border-[#e1ddcf] bg-white py-2 px-1.5 text-xs max-md:gap-1 max-md:py-1.5 max-md:px-1">
        <Span className="grid size-7 place-items-center rounded-sm bg-[#fff1d9] text-xs max-md:h-6 max-md:w-5">
          {data.workspace.avatar}
        </Span>
        <div>
          <Span className="text-[length:inherit]">{data.workspace.name}</Span>
          <Small className="block text-xs text-[#746b60]">{data.workspace.meta}</Small>
        </div>
        <LandingIcon name="chevron" className="mr-auto w-3" />
      </div>

      <SidebarLabel>{data.workspaceSectionLabel}</SidebarLabel>

      <nav aria-label={data.viewsAriaLabel} className="flex flex-col gap-1">
        {data.views.map((item) => {
          const selected = view === item.value;

          return (
            <Button
              key={item.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onViewChange(item.value)}
              variant="ghost"
              size="sm"
              className={cn(
                'navItemClass',
                'h-auto justify-start! rounded-none shadow-none hover:scale-100 active:scale-100',
                selected
                  ? 'bg-[#fff0ce] font-bold text-[#754300] hover:bg-[#fff0ce]'
                  : 'bg-transparent hover:bg-transparent',
              )}
            >
              <LandingIcon
                name={item.icon}
                className={cn(
                  'size-4 text-[#817667] max-md:size-3.5',
                  selected && 'text-[#a56a00]',
                )}
              />
              <Span className="text-[length:inherit]">{item.label}</Span>
            </Button>
          );
        })}

        {data.staticItems.map((item) => (
          <Span
            key={item.label}
            className={cn('text-[length:inherit]', cn('navItemClass text-[#1a120a]'))}
          >
            <LandingIcon name={item.icon} className="size-4 text-[#817667] max-md:size-3.5" />
            {item.label}
          </Span>
        ))}
      </nav>

      <SidebarLabel>{data.reportsSectionLabel}</SidebarLabel>

      <div className="flex flex-col gap-1">
        {data.reportLinks.map((item) => (
          <Link key={item.label} href={item.href} className="navItemClass">
            <LandingIcon name={item.icon} className="size-4 text-[#817667] max-md:size-3.5" />
            <Span className="text-[length:inherit]">{item.label}</Span>
            {item.count ? (
              <Span className="mr-auto rounded-sm border border-[#e9dfcc] px-1 text-xs">
                {item.count}
              </Span>
            ) : null}
          </Link>
        ))}
      </div>

      <div className="mt-7 flex items-center gap-2 border-t border-[#e7e1d4] pt-3.5 px-1 pb-0 text-xs">
        <Span className="grid size-7 place-items-center rounded-full bg-[#e7e5d6] text-xs">
          {data.user.initials}
        </Span>
        <div>
          <Span className="text-[length:inherit]">{data.user.name}</Span>
          <Small className="block text-xs text-[#746b60]">{data.user.role}</Small>
        </div>
      </div>
    </aside>
  );
}

function SidebarLabel({ children }: { children: string }) {
  return <P className="mx-0 mt-3 mb-1 px-2.5 text-xs text-[#898072]">{children}</P>;
}
