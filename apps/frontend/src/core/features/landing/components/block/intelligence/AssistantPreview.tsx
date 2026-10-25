import type { MouseEventHandler } from 'react';

import { P, Span } from '@/core/components/custom/ui/typography/Typography';
import { Badge } from '@/core/components/shadcn/ui/badge/badge';
import { Button } from '@/core/components/shadcn/ui/button/button';
import { Card } from '@/core/components/shadcn/ui/card/card';
import type { AssistantPreviewData } from '@/core/features/landing/assets/@types/sections';
import { AssistantReview } from '@/core/features/landing/components/block/intelligence/AssistantReview';
import { ReviewRows } from '@/core/features/landing/components/block/intelligence/ReviewRows';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { cn } from '@/core/utils/shadcn/utils';

interface AssistantPreviewProps {
  approved: boolean;
  manualOpen: boolean;
  manualReviewId: string;
  preview: AssistantPreviewData;
  onApprovalToggle: MouseEventHandler<HTMLButtonElement>;
  onManualToggle: MouseEventHandler<HTMLButtonElement>;
}

export function AssistantPreview({
  approved,
  manualOpen,
  manualReviewId,
  preview,
  onApprovalToggle,
  onManualToggle,
}: AssistantPreviewProps) {
  return (
    <Card className="relative gap-0 rounded-[14px] border border-[#e4dece] bg-[#ece9dc] p-[22px] shadow-none max-[600px]:p-[17px] max-[800px]:p-[13px]">
      <div className="overflow-hidden rounded-[9px] border border-[#dfd8c8] bg-[#fffef9] shadow-[0_8px_22px_#49391907]">
        <PreviewHeader preview={preview} />

        <div
          role="region"
          aria-label={preview.ariaLabel}
          className="p-[18px] max-[600px]:p-4 max-[800px]:p-[13px]"
        >
          <UserRequest preview={preview} />
          <AssistantReview approved={approved} preview={preview} />

          <div className="flex gap-[7px]">
            <Button
              type="button"
              onClick={onApprovalToggle}
              className={cn(
                'actionClass',
                'text-[12px] font-bold [&_svg]:size-4',
                approved && 'border border-border bg-card text-[#1a120a] hover:bg-[#f8f4ea]',
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
              onClick={onManualToggle}
              className={cn(
                'actionClass',
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
              <ReviewRows lines={preview.manualReview.lines} />
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
}

function PreviewHeader({ preview }: { preview: AssistantPreviewData }) {
  return (
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
  );
}

function UserRequest({ preview }: { preview: AssistantPreviewData }) {
  return (
    <div className="mr-[30px] rounded-[7px_7px_0_7px] bg-[#f4f3e7] p-[10px_12px] text-[11px] leading-[1.9] max-[600px]:mr-[15px] max-[600px]:text-[11px] max-[800px]:mr-[10px]">
      {preview.userMessage}
      <div className="mt-[7px] flex items-center gap-2 text-[10px] text-[#75654d] [&_svg]:size-4">
        <LandingIcon name="file" />
        {preview.attachment}
      </div>
    </div>
  );
}
