import { P, Span } from '@/core/components/custom/ui/typography/Typography';
import { Badge } from '@/core/components/shadcn/ui/badge/badge';
import type { AssistantPreviewData } from '@/core/features/landing/assets/@types/sections';
import {
  ReviewRows,
} from '@/core/features/landing/components/ui/intelligence/ReviewRows';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { cn } from '@/core/utils/shadcn/utils';

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
      <P className="mt-[18px] mb-[10px] text-[11px] leading-[2] text-[#625b4e] max-[600px]:text-[11px] [&_strong]:font-[650] [&_strong]:text-[#1a120a]">
        <strong>{answer.strong}</strong>
        <br />
        {answer.text}
      </P>

      <div className="rounded-[6px] border border-[#e8e2d6] bg-white p-3">
        <ReviewRows lines={preview.reviewLines} />

        <div className="review-line">
          <Span className="text-[10px]">{preview.statusLabel}</Span>
          <Badge
            className={cn(
              'text-[8px]',
              approved ? 'bg-[#e7f4ed] text-[#28765b]' : 'bg-[#fff7e8] text-[#8a5708]',
            )}
          >
            {status}
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
        <Span className="text-[10px]">{approvalMessage}</Span>
      </div>
    </div>
  );
}
