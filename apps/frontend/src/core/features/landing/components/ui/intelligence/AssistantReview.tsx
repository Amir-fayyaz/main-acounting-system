import { Badge, P, Span } from '@repo/web/ui';

import type { AssistantPreviewData } from '@/core/features/landing/assets/@types/sections';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { ReviewRows } from '@/core/features/landing/components/ui/intelligence/ReviewRows';
import { cn } from '@repo/web/ui/utils/cn';

export function AssistantReview({
  approved,
  preview,
}: {
  approved: boolean;
  preview: AssistantPreviewData;
}) {
  const answer = approved ? preview.approvedAnswer : preview.answer;
  const status = approved ? preview.status.approved : preview.status.pending;
  const approvalMessage = approved
    ? preview.approvalMessages.approved
    : preview.approvalMessages.pending;

  return (
    <div aria-live="polite">
      <P className="mt-4 mb-2.5 text-xs leading-loose text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
        <strong>
          <Span className="text-[length:inherit]">{answer.strong}</Span>
        </strong>
        <br />
        {answer.text}
      </P>

      <div className="rounded-md border border-border bg-card p-3">
        <ReviewRows lines={preview.reviewLines} />

        <div className="review-line">
          <Span className="text-xs">{preview.statusLabel}</Span>
          <Badge
            className={cn(
              'text-xs',
              approved ? 'bg-secondary text-muted-foreground' : 'bg-sand-soft text-muted-foreground',
            )}
          >
            <Span className="text-[length:inherit]">{status}</Span>
          </Badge>
        </div>
      </div>

      <div
        className={cn(
          'my-3 flex items-start gap-1.5 rounded-sm border py-2 px-2.5 text-xs [&_svg]:mt-0.5 [&_svg]:size-3.5',
          approved
            ? 'border-border bg-secondary text-muted-foreground'
            : 'border-border bg-accent text-muted-foreground',
        )}
      >
        <LandingIcon name="shield" />
        <Span className="text-xs">{approvalMessage}</Span>
      </div>
    </div>
  );
}
