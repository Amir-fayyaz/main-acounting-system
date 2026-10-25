import { Span } from '@/core/components/custom/ui/typography/Typography';
import type { ReviewLine } from '@/core/features/landing/assets/@types/sections';

export function ReviewRows({ lines }: { lines: readonly ReviewLine[] }) {
  return lines.map((line) => (
    <div key={line.label} className="review-line">
      <Span className="text-xs">{line.label}</Span>
      <strong>
        <Span className="text-[length:inherit]">{line.value}</Span>
      </strong>
    </div>
  ));
}
