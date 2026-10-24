import Link from 'next/link';
import type { Dispatch, SetStateAction } from 'react';

import { Button } from '@/core/components/shadcn/ui/button/button';
import type { DashboardData, DashboardView } from '@/core/features/landing/assets/@types/dashboard';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { P, Small, Span } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

const navItemClass =
  'flex w-full items-center gap-[9px] rounded-[6px] border-0 bg-none p-[9px_10px] text-right text-[11px] max-[800px]:gap-1.5 max-[800px]:p-2 max-[800px]:text-[10px]';

interface DashboardSidebarProps {
  data: DashboardData;
  view: DashboardView;
  onViewChange: Dispatch<SetStateAction<DashboardView>>;
}

export function DashboardSidebar({ data, view, onViewChange }: DashboardSidebarProps) {
  return (
    <aside
      aria-label={data.sidebarAriaLabel}
      className="border-l border-[#e5e2d9] bg-[#f4f3ec] p-[19px_12px_15px] max-[600px]:hidden max-[800px]:px-2"
    >
      <div className="inline-flex items-center gap-2 px-2 text-[23px] leading-none font-[850]">
        <Span className="grid size-[27px] place-items-center rounded-[7px] bg-[#ffa00a] text-[#1a120a]">
          <LandingIcon name="logo" className="h-[21px] w-[21px] stroke-[2.4]" />
        </Span>
        {data.brandName}
      </div>

      <div className="my-6 mb-[18px] flex items-center gap-2 rounded-[6px] border border-[#e1ddcf] bg-white p-[9px_6px] text-[11px] max-[800px]:gap-[5px] max-[800px]:p-[7px_4px] max-[800px]:text-[9px]">
        <Span className="grid size-[27px] place-items-center rounded-[5px] bg-[#fff1d9] text-[12px] max-[800px]:h-6 max-[800px]:w-[21px]">
          {data.workspace.avatar}
        </Span>
        <div>
          {data.workspace.name}
          <Small className="block text-[10px] text-[#746b60] max-[800px]:text-[8px]">
            {data.workspace.meta}
          </Small>
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
                navItemClass,
                'h-auto !justify-start rounded-none shadow-none hover:scale-100 active:scale-100',
                selected
                  ? 'bg-[#fff0ce] font-bold text-[#754300] hover:bg-[#fff0ce]'
                  : 'bg-transparent hover:bg-transparent',
              )}
            >
              <LandingIcon
                name={item.icon}
                className={cn(
                  'size-4 text-[#817667] max-[800px]:size-3.5',
                  selected && 'text-[#a56a00]',
                )}
              />
              {item.label}
            </Button>
          );
        })}

        {data.staticItems.map((item) => (
          <Span key={item.label} className={cn(navItemClass, 'text-[#1a120a]')}>
            <LandingIcon name={item.icon} className="size-4 text-[#817667] max-[800px]:size-3.5" />
            {item.label}
          </Span>
        ))}
      </nav>

      <SidebarLabel>{data.reportsSectionLabel}</SidebarLabel>

      <div className="flex flex-col gap-1">
        {data.reportLinks.map((item) => (
          <Link key={item.label} href={item.href} className={navItemClass}>
            <LandingIcon name={item.icon} className="size-4 text-[#817667] max-[800px]:size-3.5" />
            {item.label}
            {item.count ? (
              <Span className="mr-auto rounded-[4px] border border-[#e9dfcc] px-[5px] text-[9px]">
                {item.count}
              </Span>
            ) : null}
          </Link>
        ))}
      </div>

      <div className="mt-7 flex items-center gap-2 border-t border-[#e7e1d4] p-[14px_5px_0] text-[10px]">
        <Span className="grid size-[27px] place-items-center rounded-full bg-[#e7e5d6] text-[10px]">
          {data.user.initials}
        </Span>
        <div>
          {data.user.name}
          <Small className="block text-[9px] text-[#746b60]">{data.user.role}</Small>
        </div>
      </div>
    </aside>
  );
}

function SidebarLabel({ children }: { children: string }) {
  return <P className="mx-0 mt-[13px] mb-[5px] px-[10px] text-[10px] text-[#898072]">{children}</P>;
}
