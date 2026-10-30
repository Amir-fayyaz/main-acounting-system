import type { MouseEventHandler } from 'react';

import { Badge, Button, Card, P, Span } from '@repo/web/ui';

import type { AssistantPreviewData } from '@/core/features/landing/assets/@types/sections';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { AssistantReview } from '@/core/features/landing/components/ui/intelligence/AssistantReview';
import { ReviewRows } from '@/core/features/landing/components/ui/intelligence/ReviewRows';
import { cn } from '@repo/web/ui/utils/cn';

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
    <Card className="relative gap-0 rounded-xl border border-border bg-sand p-5 shadow-none max-sm:p-4 max-md:p-3">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_8px_22px_color-mix(in_srgb,var(--foreground)_3%,transparent)]">
        <PreviewHeader preview={preview} />

        <div role="region" aria-label={preview.ariaLabel} className="p-4 max-sm:p-4 max-md:p-3">
          <UserRequest preview={preview} />
          <AssistantReview approved={approved} preview={preview} />

          <div className="flex gap-1.5">
            <Button
              type="button"
              onClick={onApprovalToggle}
              className={cn(
                'h-auto min-h-10 min-w-0 flex-1 whitespace-normal rounded-sm px-3 py-1.5 text-xs',
                'text-xs font-bold [&_svg]:size-4',
                approved && 'border border-border bg-card text-foreground hover:bg-background',
              )}
            >
              <LandingIcon name={approved ? 'refresh' : 'check'} />
              <Span className="text-[length:inherit]">
                {approved ? preview.actions.restart : preview.actions.approve}
              </Span>
            </Button>

            <Button
              type="button"
              variant="outline"
              aria-expanded={manualOpen}
              aria-controls={manualReviewId}
              onClick={onManualToggle}
              className={cn(
                'h-auto min-h-10 min-w-0 flex-1 whitespace-normal rounded-sm px-3 py-1.5 text-xs',
                'border border-border bg-card font-bold text-foreground hover:bg-background',
              )}
            >
              <Span className="text-[length:inherit]">
                {manualOpen ? preview.actions.closeManual : preview.actions.manual}
              </Span>
            </Button>
          </div>

          <div id={manualReviewId} hidden={!manualOpen} className="mt-3">
            <Card className="gap-0 rounded-md border border-border bg-card p-3 shadow-none">
              <P className="mb-1.5 text-xs leading-loose font-semibold">
                {preview.manualReview.title}
              </P>
              <ReviewRows lines={preview.manualReview.lines} />
              <P className="mt-1.5 text-xs leading-loose text-muted-foreground">
                {preview.manualReview.note}
              </P>
            </Card>
          </div>
        </div>
      </div>

      <P className="mt-3 text-center text-xs text-muted-foreground">{preview.disclaimer}</P>
    </Card>
  );
}

function PreviewHeader({ preview }: { preview: AssistantPreviewData }) {
  return (
    <div className="flex items-center gap-2 border-b border-border py-3.5 px-4 text-xs font-bold max-sm:py-3 max-sm:px-3.5 max-md:gap-1.5 max-md:p-3">
      <Span className="text-[length:inherit] grid size-7 place-items-center rounded-md bg-accent text-brand-link [&_svg]:size-4">
        <LandingIcon name="spark" />
      </Span>
      <Span className="text-xs font-bold">{preview.title}</Span>
      <Badge className="mr-auto bg-sand text-muted-foreground max-sm:text-xs max-md:text-xs">
        <Span className="text-[length:inherit]">{preview.badge}</Span>
      </Badge>
    </div>
  );
}

function UserRequest({ preview }: { preview: AssistantPreviewData }) {
  return (
    <div className="mr-7 rounded-lg rounded-ee-none bg-sand py-2.5 px-3 text-xs leading-loose max-sm:mr-3.5 max-md:mr-2.5">
      <Span className="text-[length:inherit]">{preview.userMessage}</Span>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground [&_svg]:size-4">
        <LandingIcon name="file" />
        <Span className="text-[length:inherit]">{preview.attachment}</Span>
      </div>
    </div>
  );
}
