'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { H2, P, Span } from '@/core/components/custom/ui/typography/Typography';
import { Badge } from '@/core/components/shadcn/ui/badge/badge';
import { Button } from '@/core/components/shadcn/ui/button/button';
import { Card } from '@/core/components/shadcn/ui/card/card';
import type { AssistantSectionData } from '@/core/features/landing/assets/@types/sections';
import { landingAssistantSectionData } from '@/core/features/landing/assets/mock/sections';
import { BenefitsList } from '@/core/features/landing/components/ui/benefits/BenefitsList';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import {
  landingContainerClass,
  landingEyebrowClass,
} from '@/core/features/landing/lib/landing-classes';
import { cn } from '@/core/utils/shadcn/utils';

const reviewLineClass =
  'flex justify-between gap-[10px] py-[6px] text-[10px] text-[#766a59] [&+&]:border-t [&+&]:border-[#f0ede5] [&_strong]:font-[600] [&_strong]:text-[#1a120a]';

const assistantActionClass =
  'min-h-[35px] flex-1 rounded-[5px] p-[7px_13px] text-[10px] max-[600px]:min-h-[39px] max-[600px]:text-[11px] max-[800px]:px-[7px] max-[800px]:text-[9px]';

interface IntelligenceSectionProps {
  data?: AssistantSectionData;
  variant?: 'landing' | 'demo';
  className?: string;
}

export function IntelligenceSection({
  data = landingAssistantSectionData,
  variant = 'landing',
  className,
}: IntelligenceSectionProps) {
  const [approved, setApproved] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const preview = data.preview;
  const isDemo = variant === 'demo';
  const titleId = `${data.id}-title`;
  const manualReviewId = `${data.id}-manual-review`;

  const handleApprovalToggle = () => {
    if (approved) {
      setApproved(false);
      setManualOpen(false);
      toast(preview.actions.toastReset);
      return;
    }

    setApproved(true);
    toast(preview.actions.toastApproved);
  };

  const copy = (
    <div className={cn(!isDemo && 'max-[600px]:row-start-1')}>
      <Span className={cn(landingEyebrowClass, 'mb-2.5')}>{data.eyebrow}</Span>

      <H2
        id={titleId}
        className={cn(
          'mr-0 ml-0 leading-[1.7] font-[780]',
          isDemo
            ? 'mt-3 mb-[15px] text-[33px] tracking-[-0.8px] max-[900px]:text-[28px] max-[600px]:text-[27px] max-[600px]:tracking-[-0.7px]'
            : 'mt-0 mb-4 text-[34px] tracking-[-1.2px] max-[1050px]:text-[28px] max-[600px]:text-[28px] max-[800px]:text-[25px]',
        )}
      >
        {data.title.first}
        <br />
        {data.title.second}
      </H2>

      <P className="text-[13px] leading-[2.2] text-[#746b60] max-[600px]:text-[12px] max-[800px]:text-[12px]">
        {data.description}
      </P>

      {data.benefits?.length ? (
        <BenefitsList
          items={data.benefits}
          className={cn(
            isDemo
              ? 'mt-[22px] max-[600px]:gap-[15px] max-[800px]:gap-3'
              : 'my-[22px] max-[600px]:gap-[15px] max-[800px]:gap-3',
          )}
          itemClassName="max-[600px]:text-[12px] max-[800px]:text-[12px]"
          descriptionClassName="max-[600px]:text-[10px] max-[800px]:text-[10px]"
        />
      ) : null}

      {data.tags?.length ? (
        <div className="mt-[25px] mb-5 flex flex-wrap gap-2 max-[600px]:mt-5 max-[800px]:gap-[5px] [&>span]:rounded-[5px] [&>span]:border [&>span]:border-[#ddd5c5] [&>span]:p-[4px_10px] [&>span]:text-[11px] [&>span]:text-[#74634c] max-[600px]:[&>span]:p-[3px_9px] max-[600px]:[&>span]:text-[10px] max-[800px]:[&>span]:p-[3px_7px] max-[800px]:[&>span]:text-[10px]">
          {data.tags.map((tag) => (
            <Span key={tag}>{tag}</Span>
          ))}
        </div>
      ) : null}

      {data.callout ? (
        <div className="mt-[23px] flex items-start gap-[9px] rounded-[8px] border border-[#dfd2b9] bg-[#fff3dc] p-[13px_15px] text-[11px] leading-[2] text-[#805f2d] max-[600px]:mt-5 max-[600px]:p-3 max-[600px]:text-[10px]">
          <LandingIcon name="info" className="mt-[3px] size-[17px] max-[600px]:size-[15px]" />
          <Span className="text-[11px] leading-[2] max-[600px]:text-[10px]">{data.callout}</Span>
        </div>
      ) : null}

      {data.quote ? (
        <P className="mt-[22px] border-r-2 border-r-[#ffa00a] pr-[13px] text-[11px] leading-[2] max-[800px]:text-[10px]">
          {data.quote}
        </P>
      ) : null}
    </div>
  );

  const previewPanel = (
    <Card className="relative gap-0 rounded-[14px] border border-[#e4dece] bg-[#ece9dc] p-[22px] shadow-none max-[600px]:p-[17px] max-[800px]:p-[13px]">
      <div className="overflow-hidden rounded-[9px] border border-[#dfd8c8] bg-[#fffef9] shadow-[0_8px_22px_#49391907]">
        <div className="flex items-center gap-[9px] border-b border-[#ece7db] p-[14px_17px] text-[12px] font-bold max-[600px]:p-[13px_15px] max-[600px]:text-[12px] max-[800px]:gap-[6px] max-[800px]:p-3 max-[800px]:text-[11px]">
          <Span className="grid size-[29px] place-items-center rounded-[7px] bg-[#fff1d9] text-[#a46100] [&_svg]:size-[17px]">
            <LandingIcon name="spark" />
          </Span>

          <Span className="text-[12px] font-bold max-[600px]:text-[12px] max-[800px]:text-[11px]">
            {preview.title}
          </Span>

          <Badge className="mr-auto bg-[#f4eedf] text-[#76603c] max-[600px]:text-[9px] max-[800px]:text-[8px]">
            {preview.badge}
          </Badge>
        </div>

        <div
          role="region"
          aria-label={preview.ariaLabel}
          className="p-[18px] max-[600px]:p-4 max-[800px]:p-[13px]"
        >
          <div className="mr-[30px] rounded-[7px_7px_0_7px] bg-[#f4f3e7] p-[10px_12px] text-[11px] leading-[1.9] max-[600px]:mr-[15px] max-[600px]:text-[11px] max-[800px]:mr-[10px]">
            {preview.userMessage}
            <div className="mt-[7px] flex items-center gap-2 text-[10px] text-[#75654d] [&_svg]:size-4">
              <LandingIcon name="file" />
              {preview.attachment}
            </div>
          </div>

          <div aria-live="polite">
            <P className="mt-[18px] mb-[10px] text-[11px] leading-[2] text-[#625b4e] max-[600px]:text-[11px] [&_strong]:font-[650] [&_strong]:text-[#1a120a]">
              <strong>
                {approved ? preview.approvedAnswer.strong : preview.answer.strong}
              </strong>
              <br />
              {approved ? preview.approvedAnswer.text : preview.answer.text}
            </P>

            <div className="rounded-[6px] border border-[#e8e2d6] bg-white p-3">
              {preview.reviewLines.map((line) => (
                <div key={line.label} className={reviewLineClass}>
                  <Span className="text-[10px]">{line.label}</Span>
                  <strong>{line.value}</strong>
                </div>
              ))}

              <div className={reviewLineClass}>
                <Span className="text-[10px]">{preview.statusLabel}</Span>
                <Badge
                  className={cn(
                    'text-[8px]',
                    approved
                      ? 'bg-[#e7f4ed] text-[#28765b]'
                      : 'bg-[#fff7e8] text-[#8a5708]',
                  )}
                >
                  {approved ? preview.status.approved : preview.status.pending}
                </Badge>
              </div>
            </div>

            <div
              className={cn(
                'my-3 flex items-start gap-[6px] rounded-[5px] border p-[9px_10px] text-[10px] [&_svg]:mt-0.5 [&_svg]:size-[15px]',
                approved
                  ? 'border-[#cfe3d8] bg-[#eef7f1] text-[#28765b]'
                  : 'border-[#f2e0b6] bg-[#fff5df] text-[#866016]',
              )}
            >
              <LandingIcon name="shield" />
              <Span className="text-[10px]">
                {approved ? preview.approvalMessages.approved : preview.approvalMessages.pending}
              </Span>
            </div>
          </div>

          <div className="flex gap-[7px]">
            <Button
              type="button"
              onClick={handleApprovalToggle}
              className={cn(
                assistantActionClass,
                'text-[12px] font-bold [&_svg]:size-4',
                approved &&
                  'border border-border bg-card text-[#1a120a] hover:bg-[#f8f4ea]',
              )}
            >
              <LandingIcon name={approved ? 'refresh' : 'check'} />
              {approved ? preview.actions.restart : preview.actions.approve}
            </Button>

            <Button
              type="button"
              variant="outline"
              aria-expanded={manualOpen}
              aria-controls={manualReviewId}
              onClick={() => setManualOpen((open) => !open)}
              className={cn(
                assistantActionClass,
                'border border-border bg-card font-bold text-[#1a120a] hover:bg-[#f8f4ea]',
              )}
            >
              {manualOpen ? preview.actions.closeManual : preview.actions.manual}
            </Button>
          </div>

          <div id={manualReviewId} hidden={!manualOpen} className="mt-3">
            <Card className="gap-0 rounded-[6px] border border-[#e8e2d6] bg-white p-3 shadow-none">
              <P className="mb-[7px] text-[11px] leading-[2] font-[650]">
                {preview.manualReview.title}
              </P>

              {preview.manualReview.lines.map((line) => (
                <div key={line.label} className={reviewLineClass}>
                  <Span className="text-[10px]">{line.label}</Span>
                  <strong>{line.value}</strong>
                </div>
              ))}

              <P className="mt-[7px] text-[10px] leading-[2] text-[#746b60]">
                {preview.manualReview.note}
              </P>
            </Card>
          </div>
        </div>
      </div>

      <P className="mt-[13px] text-center text-[10px] text-[#6b6256] max-[600px]:text-[9px]">
        {preview.disclaimer}
      </P>
    </Card>
  );

  return (
    <section
      id={data.id}
      aria-labelledby={titleId}
      className={cn(
        landingContainerClass,
        isDemo
          ? 'border-t border-[#e4dfd2] pt-[55px] pb-[30px] max-[600px]:py-[43px]'
          : 'pt-[92px] pb-[94px] max-[600px]:pt-[60px] max-[600px]:pb-[58px] max-[800px]:pb-[65px]',
        className,
      )}
    >
      <div
        className={cn(
          'grid grid-cols-2 items-center',
          isDemo
            ? 'gap-[75px] max-[1100px]:gap-[45px] max-[900px]:gap-[30px] max-[600px]:grid-cols-1 max-[600px]:gap-[25px]'
            : 'gap-20 max-[1050px]:gap-[38px] max-[600px]:grid-cols-1 max-[600px]:gap-[26px] max-[800px]:gap-[30px]',
        )}
      >
        {isDemo ? (
          <>
            {copy}
            {previewPanel}
          </>
        ) : (
          <>
            {previewPanel}
            {copy}
          </>
        )}
      </div>
    </section>
  );
}
