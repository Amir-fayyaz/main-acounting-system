'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button, H2, P, Small, Span, Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/web/ui';

import type { WorkflowSectionData } from '@/core/features/landing/assets/@types/sections';
import { landingWorkflowSectionData } from '@/core/features/landing/assets/mock/sections';
import { BenefitsList } from '@/core/features/landing/components/ui/benefits/BenefitsList';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { cn } from '@repo/web/ui/utils/cn';

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
    <section className="py-8 sm:py-12">
      <div id={data.id} aria-labelledby={titleId} className={className}>
        <div
          className={cn(
            'grid grid-cols-2 items-center',
            isPlain
              ? 'gap-20 max-xl:gap-11 max-lg:gap-7 max-sm:grid-cols-1 max-sm:gap-6'
              : 'gap-12 rounded-2xl border border-border bg-card p-9 max-xl:gap-7 max-xl:p-6 max-sm:grid-cols-1 max-sm:gap-6 max-sm:rounded-xl max-sm:py-6 max-sm:px-5 max-md:grid-cols-2 max-md:gap-6 max-md:p-6',
          )}
        >
          <div>
            <Span className="landingEyebrowClass">{data.eyebrow}</Span>

            <H2
              id={titleId}
              className={cn(
                'mr-0 ml-0 leading-relaxed font-extrabold',
                isPlain
                  ? 'mt-3 mb-3.5 text-3xl tracking-tight max-sm:text-2xl'
                  : 'mt-0 mb-4 text-3xl tracking-tighter max-xl:text-2xl max-sm:mb-3 max-sm:text-2xl max-sm:tracking-tight max-md:text-2xl',
              )}
            >
              {data.title.first}
              <br />
              {data.title.second}
            </H2>

            <P className="text-xs leading-loose text-muted-foreground">{data.description}</P>

            {data.benefits?.length ? (
              <BenefitsList
                items={data.benefits}
                className={cn(
                  isPlain
                    ? 'mt-5 mb-0 max-sm:gap-3.5 max-md:gap-3'
                    : 'my-6 max-sm:my-5 max-sm:gap-3.5 max-md:gap-3',
                )}
                itemClassName="max-sm:text-xs max-md:text-xs"
                descriptionClassName="max-sm:text-xs max-md:text-xs"
              />
            ) : null}

            {data.cta ? (
              <Button
                asChild
                variant="secondary"
                className="border border-ink-soft bg-ink-soft text-sand-soft hover:bg-foreground hover:text-sand-soft max-sm:min-h-10 max-sm:py-2.5 max-sm:px-4 max-sm:text-xs"
              >
                <Link href={data.cta.href}>
                  <Span className="text-[length:inherit]">{data.cta.label}</Span>
                  <LandingIcon name="arrow" />
                </Link>
              </Button>
            ) : null}
          </div>

          <div className="relative rounded-xl border border-border bg-background p-5 max-sm:p-3.5 max-md:p-3">
            <div className="mb-3.5 flex items-center justify-between text-xs font-semibold">
              <Span className="text-xs">{data.boardTitle}</Span>
              <LandingIcon name="link" className="size-4 text-muted-foreground" />
            </div>

            <Tabs
              value={activeTab?.key ?? ''}
              onValueChange={setFlow}
              className="gap-0 flex flex-col"
            >
              <TabsList
                aria-label={data.tabsAriaLabel}
                variant="line"
                className="mb-4 flex h-auto! w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0 pb-3 max-sm:gap-0.5"
              >
                {data.tabs.map((tab) => (
                  <TabsTrigger key={tab.key} value={tab.key} className="workflowTabClass">
                    <Span className="text-[length:inherit]">{tab.label}</Span>
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
                        'relative mt-3 flex min-h-16 items-center justify-between gap-3 rounded-md border border-sand bg-card p-3 max-sm:gap-2 max-sm:p-2.5 max-md:gap-2 max-md:p-2.5',
                        index > 0 &&
                          "before:absolute before:-top-3.5 before:right-8 before:h-3 before:w-px before:bg-border before:content-['']",
                        index === steps.length - 1 && 'border-secondary bg-secondary',
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3 max-sm:gap-2 max-md:gap-2">
                        <Span className="shrink-0 text-left text-xs font-semibold whitespace-nowrap [&_small]:font-normal">
                          {step.value}
                          <Small className="block text-xs">{step.unit}</Small>
                        </Span>
                      </div>

                      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                        <div className="min-w-0 mx-0 text-right">
                          <strong className="block text-xs">
                            <Span className="text-[length:inherit]">{step.title}</Span>
                          </strong>

                          <Small className="mt-0.5 block text-xs text-muted-foreground">
                            {step.description}
                          </Small>
                        </div>

                        <Span
                          className={cn(
                            'text-[length:inherit]',
                            cn(
                              'grid h-9 w-10 shrink-0 place-items-center rounded-sm border border-border bg-card text-brand-link max-sm:h-8 max-sm:w-7 max-md:h-7 max-md:w-7 [&_svg]:size-4 max-sm:[&_svg]:size-3.5',
                              index === steps.length - 1 && 'text-muted-foreground',
                            ),
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

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground [&>span]:flex [&>span]:items-center [&>span]:gap-1 [&_svg]:size-3 [&_svg]:text-muted-foreground max-sm:[&>span:last-child]:hidden max-md:[&>span:last-child]:hidden">
              <Span className="text-xs">
                <LandingIcon name="shield" />
                {data.securityLabel}
              </Span>
              <Span className="text-[length:inherit]">{data.footerCaption}</Span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
