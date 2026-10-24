'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/core/components/shadcn/ui/button/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/components/shadcn/ui/tabs/tabs';
import type { WorkflowSectionData } from '@/core/features/landing/assets/@types/sections';
import { landingWorkflowSectionData } from '@/core/features/landing/assets/mock/sections';
import { BenefitsList } from '@/core/features/landing/components/ui/benefits/BenefitsList';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import {
  landingContainerClass,
  landingEyebrowClass,
} from '@/core/features/landing/lib/landing-classes';
import { H2, P, Small, Span } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

const workflowTabClass =
  'h-auto min-w-0 flex-1 rounded-[5px] border-0 bg-transparent p-1.5 text-[11px] font-normal normal-case text-[#756950] shadow-none transition-none group-data-horizontal/tabs:h-auto hover:scale-100 hover:bg-transparent hover:text-[#756950] active:scale-100 data-[state=active]:bg-[#fff1d9] data-[state=active]:font-bold data-[state=active]:text-[#865000] data-[state=active]:hover:bg-[#fff1d9] data-[state=active]:hover:text-[#865000] max-[600px]:text-[10px]';

interface ConnectedSectionProps {
  data?: WorkflowSectionData;
  /**
   * `card` keeps the bordered landing layout; `plain` is the open two-column
   * layout used on the demo page.
   */
  variant?: 'card' | 'plain';
  className?: string;
}

export function ConnectedSection({
  data = landingWorkflowSectionData,
  variant = 'card',
  className,
}: ConnectedSectionProps) {
  const [flow, setFlow] = useState(data.tabs[0]?.key ?? '');
  const isPlain = variant === 'plain';
  const titleId = `${data.id}-title`;
  const activeTab = data.tabs.find((tab) => tab.key === flow) ?? data.tabs[0];

  return (
    <section
      id={data.id}
      aria-labelledby={titleId}
      className={cn(
        landingContainerClass,
        isPlain
          ? 'py-[67px] max-[900px]:py-[55px] max-[600px]:py-[43px]'
          : 'pt-[2px] pb-[67px] max-[600px]:pt-0 max-[600px]:pb-[45px]',
        className,
      )}
    >
      <div
        className={cn(
          'grid grid-cols-2 items-center',
          isPlain
            ? 'gap-[75px] max-[1100px]:gap-[45px] max-[900px]:gap-[30px] max-[600px]:grid-cols-1 max-[600px]:gap-[25px]'
            : 'gap-[50px] rounded-[16px] border border-[#e7e1d4] bg-[#fffef9] p-9 max-[1050px]:gap-[30px] max-[1050px]:p-[26px] max-[600px]:grid-cols-1 max-[600px]:gap-[25px] max-[600px]:rounded-xl max-[600px]:p-[23px_20px] max-[800px]:grid-cols-2 max-[800px]:gap-[25px] max-[800px]:p-[25px]',
        )}
      >
        <div>
          <Span className={landingEyebrowClass}>{data.eyebrow}</Span>

          <H2
            id={titleId}
            className={cn(
              'mr-0 ml-0 leading-[1.7] font-[780]',
              isPlain
                ? 'mt-3 mb-[15px] text-[33px] tracking-[-0.8px] max-[900px]:text-[28px] max-[600px]:mt-3 max-[600px]:text-[27px] max-[600px]:tracking-[-0.7px]'
                : 'mt-0 mb-4 text-[30px] tracking-[-1.2px] max-[1050px]:text-[27px] max-[600px]:mb-[13px] max-[600px]:text-[25px] max-[600px]:tracking-[-0.9px] max-[800px]:text-[23px]',
            )}
          >
            {data.title.first}
            <br />
            {data.title.second}
          </H2>

          <P className="text-[13px] leading-[2.2] text-[#746b60] max-[600px]:text-[11px] max-[800px]:text-[12px]">
            {data.description}
          </P>

          {data.benefits?.length ? (
            <BenefitsList
              items={data.benefits}
              className={cn(
                isPlain
                  ? 'mt-[22px] mb-0 max-[600px]:mt-5 max-[600px]:gap-[15px] max-[800px]:gap-3'
                  : 'my-6 max-[600px]:my-5 max-[600px]:gap-[15px] max-[800px]:gap-3',
              )}
              itemClassName="max-[600px]:text-[12px] max-[800px]:text-[12px]"
              descriptionClassName="max-[600px]:text-[10px] max-[800px]:text-[10px]"
            />
          ) : null}

          {data.cta ? (
            <Button
              asChild
              variant="secondary"
              className="border border-[#231b12] bg-[#231b12] text-[#fff7e8] hover:bg-[#35291c] hover:text-[#fff7e8] max-[600px]:min-h-[42px] max-[600px]:p-[10px_17px] max-[600px]:text-[12px]"
            >
              <Link href={data.cta.href}>
                {data.cta.label}
                <LandingIcon name="arrow" />
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="relative rounded-[13px] border border-[#e3dccd] bg-[#f8f7ef] p-[21px] max-[600px]:p-3.5 max-[800px]:p-[13px]">
          <div className="mb-[15px] flex items-center justify-between text-[12px] font-[650] max-[600px]:text-[11px]">
            <Span className="text-[11px]">{data.boardTitle}</Span>
            <LandingIcon name="link" className="size-4 text-[#8c7a61]" />
          </div>

          <Tabs
            value={activeTab?.key ?? ''}
            onValueChange={setFlow}
            className="gap-0 flex flex-col"
          >
            <TabsList
              aria-label={data.tabsAriaLabel}
              variant="line"
              className="mb-[17px] flex !h-auto w-full justify-start gap-[5px] rounded-none border-b border-[#eee8dc] bg-transparent p-0 pb-3 max-[600px]:gap-[2px]"
            >
              {data.tabs.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key} className={workflowTabClass}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {data.tabs.map((tab) => (
              <TabsContent
                key={tab.key}
                value={tab.key}
                aria-live="polite"
                className="text-sm outline-none"
              >
                {(data.flows[tab.key]?.steps ?? []).map((step, index, steps) => (
                  <div
                    key={step.title}
                    className={cn(
                      'relative mt-[13px] flex min-h-[66px] items-center justify-between gap-[13px] rounded-[7px] border border-[#f1ede2] bg-card p-[13px] max-[600px]:min-h-16 max-[600px]:gap-2 max-[600px]:p-2.5 max-[800px]:gap-[9px] max-[800px]:p-2.5',
                      index > 0 &&
                        "before:absolute before:-top-[14px] before:right-8 before:h-[13px] before:w-px before:bg-[#d4c6ab] before:content-['']",
                      index === steps.length - 1 && 'border-[#e5eee1] bg-[#eff5ee]',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-[13px] max-[600px]:gap-2 max-[800px]:gap-[9px]">
                      <Span className="shrink-0 text-left text-[11px] font-[600] whitespace-nowrap max-[600px]:text-[10px] max-[800px]:text-[10px] [&_small]:font-normal">
                        {step.value}
                        <Small className="block text-[11px]">{step.unit}</Small>
                      </Span>
                    </div>

                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                      <div className="min-w-0 mx-0 text-right">
                        <strong className="block text-[11px] max-[600px]:text-[10px] max-[800px]:text-[9px]">
                          {step.title}
                        </strong>

                        <Small className="mt-[2px] block text-[10px] text-[#746b60] max-[600px]:text-[8px] max-[800px]:text-[8px]">
                          {step.description}
                        </Small>
                      </div>

                      <Span
                        className={cn(
                          'grid h-[35px] w-[39px] shrink-0 place-items-center rounded-[5px] border border-[#eee7d9] bg-white text-[#b36b00] max-[600px]:h-[31px] max-[600px]:w-[29px] max-[800px]:h-[30px] max-[800px]:w-7 [&_svg]:size-[18px] max-[600px]:[&_svg]:size-[15px]',
                          index === steps.length - 1 && 'text-[#28765b]',
                        )}
                      >
                        <LandingIcon name={step.icon} />
                      </Span>
                    </div>
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>

          <div className="mt-[17px] flex items-center justify-between text-[10px] text-[#746b60] max-[600px]:text-[8px] max-[800px]:text-[9px] [&>span]:flex [&>span]:items-center [&>span]:gap-[5px] [&_svg]:size-3 [&_svg]:text-[#28765b] max-[600px]:[&>span:last-child]:hidden max-[800px]:[&>span:last-child]:hidden">
            <Span className="text-[12px]">
              <LandingIcon name="shield" />
              {data.securityLabel}
            </Span>
            <span>{data.footerCaption}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
