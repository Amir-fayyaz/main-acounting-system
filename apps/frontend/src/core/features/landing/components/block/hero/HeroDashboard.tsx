'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import { H2, P, Small, Span } from '@/core/components/custom/ui/typography/Typography';
import { Badge } from '@/core/components/shadcn/ui/badge/badge';
import { Button } from '@/core/components/shadcn/ui/button/button';
import { Card } from '@/core/components/shadcn/ui/card/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/components/shadcn/ui/select/select';
import type {
  DashboardData,
  DashboardPeriod,
  DashboardView,
} from '@/core/features/landing/assets/@types/dashboard';
import { landingDashboardData } from '@/core/features/landing/assets/mock/dashboard';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { landingContainerClass } from '@/core/features/landing/lib/landing-classes';
import { cn } from '@/core/utils/shadcn/utils';

const dashNavItemClass =
  'flex w-full items-center gap-[9px] rounded-[6px] border-0 bg-none p-[9px_10px] text-right text-[11px] max-[800px]:gap-1.5 max-[800px]:p-2 max-[800px]:text-[10px]';

const dashboardBaseClass =
  "relative mx-auto rounded-t-[15px] border border-[#ded9cb] bg-[#e9e6dc] p-[8px_8px_0] shadow-[0_20px_60px_#4735180d] before:absolute before:inset-[-7px_22px_auto] before:-z-10 before:h-2 before:rounded-t-[13px] before:border before:border-b-0 before:border-[#e4dece] before:content-[''] max-[1050px]:mx-[18px] max-[600px]:rounded-t-[10px] max-[600px]:p-[5px_5px_0] max-[600px]:shadow-[0_10px_30px_#49391908] max-[800px]:mx-0";

const dashboardInnerClass =
  'relative grid min-h-[470px] grid-cols-[174px_1fr] overflow-hidden rounded-t-[9px] border border-[#dfdbd1] bg-[#fcfcf8] leading-[1.7] max-[600px]:min-h-0 max-[600px]:grid-cols-1 max-[600px]:rounded-t-[6px] max-[800px]:min-h-[438px] max-[800px]:grid-cols-[132px_1fr]';

function barHeight(bars: number[], index: number, period: DashboardPeriod) {
  if (period === 'year') {
    return `${Math.max(18, bars[index] - 8 + (index % 3) * 7)}%`;
  }

  return `${bars[index]}%`;
}

interface HeroDashboardProps {
  /** Content for the preview. Landing and demo each provide their own mock data. */
  data?: DashboardData;
  /** Anchor id for the dashboard preview (e.g. `demo` on the demo page). */
  id?: string;
  variant?: 'landing' | 'demo';
  className?: string;
}

export function HeroDashboard({
  data = landingDashboardData,
  id = 'product-preview',
  variant = 'landing',
  className,
}: HeroDashboardProps) {
  const [view, setView] = useState<DashboardView>('overview');
  const [period, setPeriod] = useState<DashboardPeriod>('month');

  const report = data.reports[view];
  const annual = period === 'year';
  const labels = annual ? data.labelsYear : data.labelsMonth;
  const isDemo = variant === 'demo';

  return (
    <div className={landingContainerClass}>
      <div
        id={id}
        className={cn(
          dashboardBaseClass,
          isDemo
            ? 'mt-[25px] max-w-[1160px] rounded-[15px] pb-2 max-[600px]:mt-8'
            : 'mt-12 max-w-[1080px] min-[1500px]:mt-[54px] max-[600px]:mt-8',
          className,
        )}
      >
        <div
          role="region"
          aria-label={data.previewAriaLabel}
          className={cn(
            dashboardInnerClass,
            isDemo && 'min-h-[480px] rounded-[9px] max-[600px]:min-h-0 max-[600px]:rounded-[6px]',
          )}
        >
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

            <P className="mx-0 mt-[13px] mb-[5px] px-[10px] text-[10px] text-[#898072]">
              {data.workspaceSectionLabel}
            </P>

            <nav aria-label={data.viewsAriaLabel} className="flex flex-col gap-1">
              {data.views.map((item) => (
                <Button
                  key={item.value}
                  type="button"
                  aria-pressed={view === item.value}
                  onClick={() => setView(item.value)}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    dashNavItemClass,
                    'h-auto !justify-start rounded-none shadow-none hover:scale-100 active:scale-100',
                    view === item.value
                      ? 'bg-[#fff0ce] font-bold text-[#754300] hover:bg-[#fff0ce]'
                      : 'bg-transparent hover:bg-transparent',
                  )}
                >
                  <LandingIcon
                    name={item.icon}
                    className={cn(
                      'size-4 text-[#817667] max-[800px]:size-3.5',
                      view === item.value && 'text-[#a56a00]',
                    )}
                  />
                  {item.label}
                </Button>
              ))}

              {data.staticItems.map((item) => (
                <Span key={item.label} className={cn(dashNavItemClass, 'text-[#1a120a]')}>
                  <LandingIcon
                    name={item.icon}
                    className="size-4 text-[#817667] max-[800px]:size-3.5"
                  />
                  {item.label}
                </Span>
              ))}
            </nav>

            <P className="mx-0 mt-[13px] mb-[5px] px-[10px] text-[10px] text-[#898072]">
              {data.reportsSectionLabel}
            </P>

            <div className="flex flex-col gap-1">
              {data.reportLinks.map((item) => (
                <Link key={item.label} href={item.href} className={dashNavItemClass}>
                  <LandingIcon
                    name={item.icon}
                    className="size-4 text-[#817667] max-[800px]:size-3.5"
                  />
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

          <div className="min-w-0">
            <div className="flex h-[58px] items-center justify-between gap-3 border-b border-[#eae7df] bg-white px-[22px] max-[600px]:h-[43px] max-[600px]:px-[13px] max-[800px]:px-[15px]">
              <div className="flex items-center gap-[10px] text-[12px] font-[650] max-[600px]:gap-[7px] max-[600px]:text-[10px] max-[600px]:before:ml-[3px] max-[600px]:before:border-l max-[600px]:before:border-[#ddd3c1] max-[600px]:before:pl-[10px] max-[600px]:before:text-[17px] max-[600px]:before:font-[850] max-[600px]:before:content-['تراز']">
                <LandingIcon
                  name="grid"
                  className="size-[17px] text-[#8a7e6c] max-[600px]:hidden"
                />

                <Span className="max-[600px]:hidden">{report.name}</Span>

                <Select value={view} onValueChange={(value) => setView(value as DashboardView)}>
                  <SelectTrigger
                    aria-label={data.viewSelectLabel}
                    className="!hidden !h-auto !w-auto !border-0 !bg-transparent !p-0 !text-[10px] !text-[#1a120a] !shadow-none max-[600px]:!flex max-[600px]:max-w-[125px] max-[360px]:max-w-[105px]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start" className="min-w-[145px]">
                    {data.views.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 max-[600px]:gap-[9px]">
                <Badge className="bg-[#fff1d9] px-1.5 py-0.5 text-[10px] text-[#875100] max-[600px]:text-[9px]">
                  {data.previewBadgeLabel}
                </Badge>

                <Span className="grid size-[27px] place-items-center rounded-full bg-[#e7e5d6] text-[10px] max-[360px]:hidden">
                  {data.user.initials}
                </Span>
              </div>
            </div>

            <div className="p-[21px_23px_22px] max-[600px]:p-[15px_12px_18px] max-[800px]:p-[17px_15px]">
              <div className="mb-[17px] flex items-center justify-between gap-3 max-[360px]:items-start max-[600px]:mb-[13px] max-[600px]:gap-[7px] max-[360px]:[&>div:first-child]:min-w-0">
                <div aria-live="polite" aria-atomic="true">
                  <H2
                    id="dash-greeting"
                    className="mb-1 text-[17px] tracking-[-0.4px] max-[600px]:text-[14px] max-[800px]:text-[15px]"
                  >
                    {report.title}
                  </H2>
                  <P
                    id="dash-subtitle"
                    className="text-[10px] text-[#746b60] max-[600px]:text-[8px]"
                  >
                    {report.subtitle}
                  </P>
                </div>

                <div
                  role="group"
                  aria-label={data.periodAriaLabel}
                  className="flex gap-[3px] rounded-[5px] border border-[#dfdbd1] bg-white p-[3px] max-[360px]:shrink-0 max-[600px]:p-[2px]"
                >
                  {data.periodOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      aria-pressed={period === option.value}
                      onClick={() => setPeriod(option.value)}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-auto rounded-[3px] border-0 bg-transparent p-[4px_10px] text-[10px] font-normal text-[#746b60] shadow-none hover:scale-100 hover:bg-transparent active:scale-100 max-[360px]:px-[5px] max-[360px]:whitespace-nowrap max-[600px]:p-[3px_7px] max-[600px]:text-[9px]',
                        period === option.value &&
                          'bg-[#f4f3e7] font-bold text-[#1a120a] hover:bg-[#f4f3e7]',
                      )}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 max-[360px]:grid-cols-1 max-[360px]:gap-[7px] max-[600px]:gap-1.5 max-[800px]:gap-2">
                {report.labels.map((label, index) => (
                  <Card
                    key={label}
                    className="gap-0 rounded-[8px] border border-[#e8e4db] bg-white p-[13px_14px] shadow-none max-[360px]:grid max-[360px]:grid-cols-[1fr_auto] max-[360px]:gap-[3px_9px] max-[360px]:p-[10px_11px] max-[600px]:rounded-[6px] max-[600px]:p-[9px_8px] max-[800px]:p-[10px]"
                  >
                    <div className="flex justify-between gap-2 text-[10px] text-[#746b60] max-[360px]:col-start-1 max-[360px]:row-start-1 max-[360px]:justify-start max-[360px]:gap-[5px] max-[360px]:text-[9px] max-[600px]:gap-[2px] max-[600px]:text-[8px]">
                      <Span className="!text-[10px] max-[360px]:!text-[9px] max-[600px]:!text-[8px]">
                        {label}
                      </Span>
                      <LandingIcon
                        name={data.kpiIcons[index]}
                        className="h-[15px] w-[15px] text-[#b1823d] max-[600px]:size-3"
                      />
                    </div>

                    <div className="my-1.5 mb-1 text-[20px] font-[750] tracking-[-0.3px] max-[360px]:col-start-2 max-[360px]:row-[1/3] max-[360px]:my-0 max-[360px]:self-center max-[360px]:whitespace-nowrap max-[360px]:text-[16px] max-[600px]:my-[5px_3px] max-[600px]:text-[16px] max-[600px]:leading-[1.7] max-[800px]:text-[17px]">
                      <Span>{report[period][index]}</Span>
                      <Small className="mr-[3px] text-[10px] font-normal text-[#746b60] max-[360px]:mr-[3px] max-[360px]:inline max-[360px]:text-[8px] max-[600px]:m-0 max-[600px]:block max-[600px]:text-[8px] max-[800px]:text-[9px]">
                        {data.kpiUnit}
                      </Small>
                    </div>

                    <div className="text-[9px] text-[#716c5d] max-[360px]:col-start-1 max-[360px]:row-start-2 max-[360px]:max-w-[125px] max-[360px]:text-[8px] max-[600px]:text-[7px] max-[600px]:leading-[1.8] max-[800px]:text-[8px]">
                      <Span className="!text-[10px] max-[360px]:!text-[9px] max-[600px]:!text-[8px]">
                        {(annual ? report.yearFeet : report.feet)[index]}
                      </Span>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="mt-[13px] grid grid-cols-[1.4fr_1fr] gap-3 max-[600px]:mt-[9px] max-[600px]:grid-cols-1 max-[800px]:grid-cols-[1.2fr_1fr] max-[800px]:gap-2">
                <Card className="gap-0 rounded-[8px] border border-[#e8e4db] bg-white p-[14px] shadow-none max-[600px]:p-[11px] max-[800px]:p-[11px]">
                  <div className="flex justify-between gap-[7px] text-[11px] font-[650] max-[600px]:text-[10px]">
                    <Span className="!text-[11px] !font-[650] max-[600px]:!text-[10px]">
                      {report.chart}
                    </Span>

                    <Small className="!text-[9px] !font-normal text-[#746b60] max-[600px]:!text-[8px]">
                      {data.chartUnits[period]}
                    </Small>
                  </div>

                  <div className="mt-3 flex gap-3 text-[9px] text-[#746b60] max-[600px]:mt-[7px] max-[600px]:text-[8px]">
                    {report.legend.map((item, index) => (
                      <Span
                        key={item}
                        className="!flex items-center gap-1 !text-[9px] max-[600px]:!text-[8px]"
                      >
                        <i
                          aria-hidden="true"
                          className={cn(
                            'block size-1.5 rounded-[2px] bg-[#ffa00a]',
                            index === 1 && 'bg-[#e8e4d8]',
                          )}
                        />
                        <Span className="!text-[9px] max-[600px]:!text-[8px]">{item}</Span>
                      </Span>
                    ))}
                  </div>

                  <div
                    role="img"
                    aria-label={`${data.chartAriaLabelPrefix} ${report.chart}، ${
                      annual ? 'نیمه نخست سال' : 'شش ماه اخیر'
                    }`}
                    className="relative mt-[7px] flex h-[130px] items-end justify-around gap-[clamp(4px,1.5vw,15px)] border-b border-[#ece8dd] px-[clamp(3px,1vw,9px)] pt-[10px] [background:repeating-linear-gradient(to_top,transparent_0,transparent_36px,#f0ede6_37px,transparent_38px)] [direction:rtl] sm:h-[150px] md:gap-[10px] md:px-[6px] lg:h-[170px] lg:gap-[15px] lg:px-[9px] max-[600px]:h-[100px] max-[600px]:pt-[7px] max-[400px]:h-[85px] max-[400px]:gap-[3px] max-[400px]:px-[2px]"
                  >
                    {[0, 1, 2, 3, 4, 5].map((group) => (
                      <div
                        key={group}
                        className="flex h-full min-w-0 flex-1 items-end justify-center gap-[clamp(2px,0.5vw,5px)]"
                      >
                        <i
                          aria-hidden="true"
                          className="h-[var(--height)] w-[18px] max-w-[32%] rounded-t-[3px] bg-[#ffa00a] transition-[height] duration-500 max-[800px]:w-[14px] max-[600px]:w-[12px] max-[400px]:w-[9px]"
                          style={
                            {
                              '--height': barHeight(report.bars, group * 2, period),
                            } as CSSProperties
                          }
                        />

                        <i
                          aria-hidden="true"
                          className="h-[var(--height)] w-[18px] max-w-[32%] rounded-t-[3px] bg-[#e8e4d8] transition-[height] duration-500 max-[800px]:w-[14px] max-[600px]:w-[12px] max-[400px]:w-[9px]"
                          style={
                            {
                              '--height': barHeight(report.bars, group * 2 + 1, period),
                            } as CSSProperties
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-around pt-[5px] text-[9px] text-[#746b60] max-[600px]:text-[8px]">
                    {labels.map((label) => (
                      <Span key={label} className="!text-[9px] max-[600px]:!text-[8px]">
                        {label}
                      </Span>
                    ))}
                  </div>
                </Card>

                <Card className="gap-0 rounded-[8px] border border-[#e8e4db] bg-white p-[14px] shadow-none max-[600px]:hidden max-[800px]:p-[11px]">
                  <div className="flex justify-between gap-[7px] text-[11px] font-[650] max-[600px]:text-[10px]">
                    <Span className="!text-[11px] !font-[650] max-[600px]:!text-[10px]">
                      {data.tasksTitle}
                    </Span>

                    <Small className="!text-[9px] !font-normal text-[#746b60] max-[600px]:!text-[8px]">
                      {data.tasksCount}
                    </Small>
                  </div>

                  <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
                    {data.tasks.map((task) => (
                      <li
                        key={task.title}
                        className="flex items-center gap-[7px] border-b border-[#efede7] pb-2 text-[10px] last:border-0 last:pb-0"
                      >
                        <Span className="!grid size-7 place-items-center rounded-[6px] border border-[#eee7da] bg-[#faf8f2] !text-[#a56700]">
                          <LandingIcon name={task.icon} className="size-3.5" />
                        </Span>

                        <div>
                          <Span className="!text-[10px]">{task.title}</Span>
                          <P className="mt-[1px] !text-[9px] text-[#746b60]">
                            {task.description}
                          </P>
                        </div>

                        <Badge className="mr-auto bg-[#fff1d9] p-[2px_5px] text-[8px] max-[800px]:hidden">
                          {task.badge}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              <div className="mt-3 flex items-center justify-between gap-[10px] rounded-[6px] border border-[#e6e2d4] bg-[#f5f3e9] p-[10px_12px] text-[10px] max-[600px]:mt-[9px] max-[600px]:gap-1 max-[600px]:p-2 max-[600px]:text-[8px] max-[800px]:text-[9px]">
                <div className="flex items-center gap-[8px] max-[600px]:gap-[5px]">
                  <LandingIcon
                    name="spark"
                    className="size-[17px] text-[#a46700] max-[600px]:size-3.5"
                  />
                  <Span className="!text-[10px] max-[800px]:!text-[9px] max-[600px]:!text-[8px]">
                    {report.insight}
                  </Span>
                </div>

                <Link
                  href={data.insightHref}
                  className="whitespace-nowrap text-[9px] text-[#885300] max-[600px]:text-[8px]"
                >
                  {data.insightLinkLabel}
                </Link>
              </div>
            </div>

            {data.footerNote ? (
              <div className="m-2 flex justify-end max-[600px]:hidden">
                <Span className="rounded-[4px] bg-[#f7f6eedb] p-[2px_8px] !text-[9px] text-[#827866]">
                  {data.footerNote}
                </Span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
