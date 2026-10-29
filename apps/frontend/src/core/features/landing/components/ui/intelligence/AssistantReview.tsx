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
      <P className="mt-4 mb-2.5 text-xs leading-loose text-[#625b4e] [&_strong]:font-semibold [&_strong]:text-foreground">
        <strong>
          <Span className="text-[length:inherit]">{answer.strong}</Span>
        </strong>
        <br />
        {answer.text}
      </P>

      <div className="rounded-md border border-[#e8e2d6] bg-white p-3">
        <ReviewRows lines={preview.reviewLines} />

        <div className="review-line">
          <Span className="text-xs">{preview.statusLabel}</Span>
          <Badge
            className={cn(
              'text-xs',
              approved ? 'bg-[#e7f4ed] text-[#28765b]' : 'bg-[#fff7e8] text-[#8a5708]',
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
            ? 'border-[#cfe3d8] bg-[#eef7f1] text-[#28765b]'
            : 'border-[#f2e0b6] bg-[#fff5df] text-[#866016]',
        )}
      >
        <LandingIcon name="shield" />
        <Span className="text-xs">{approvalMessage}</Span>
      </div>
    </div>
  );
}
